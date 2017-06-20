/*
  This file is part of Vidjil <http://www.vidjil.org>
  Copyright (C) 2011-2017 by Bonsai bioinformatics
  at CRIStAL (UMR CNRS 9189, Université Lille) and Inria Lille
  Contributors: 
      Mathieu Giraud <mathieu.giraud@vidjil.org>
      Mikaël Salson <mikael.salson@vidjil.org>
      Marc Duez <marc.duez@vidjil.org>

  "Vidjil" is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  "Vidjil" is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with "Vidjil". If not, see <http://www.gnu.org/licenses/>
*/

#include <fstream>
#include <iostream>
#include <iomanip>
#include <algorithm>
#include <cctype>
#include <stdexcept>
#include "fasta.h"

#include "../lib/gzstream.h"


// http://stackoverflow.com/a/5840160/4475279
unsigned long long filesize(const char* filename)
{
    std::ifstream in(filename, std::ifstream::ate | std::ifstream::binary);
    return in.tellg();
}

// OnlineFasta

OnlineFasta::OnlineFasta(int extract_field, string extract_separator,
                         int nb_sequences_max, int only_nth_sequence)
  :OnlineBioReader(extract_field, extract_separator, nb_sequences_max, only_nth_sequence) {}

OnlineFasta::OnlineFasta(const string &input_filename, 
                         int extract_field, string extract_separator,
                         int nb_sequences_max, int only_nth_sequence)
  :OnlineBioReader(input_filename, extract_field, extract_separator, nb_sequences_max, only_nth_sequence) {this->init();}

OnlineFasta::~OnlineFasta() {
  if (input_allocated)
    delete input;
}

void OnlineFasta::init() {
  if (! filename.empty()) {
    input = new igzstream(filename.c_str());

    if (this->input->fail()) {
      delete this->input;
      throw invalid_argument("!! Error in opening file "+filename);
    }

    cout << "  <== " << filename << endl ;
  }

  line = getInterestingLine();
}

bool OnlineFasta::hasNextData() {
  return ((!input->eof()) || line.length() > 0);
}

bool OnlineFasta::hasNext() {
  return hasNextData()
    && ((nb_sequences_max == NO_LIMIT_VALUE) || (nb_sequences_returned < nb_sequences_max));
}

void OnlineFasta::next() {
  fasta_state state = FASTX_UNINIT;

  // Reinit the Sequence object
  current.label_full.erase();
  current.label.erase();
  current.sequence.erase();
  current.quality.erase();
  if (current.seq) {
    delete [] current.seq;
    current.seq = NULL;
    current.marked_pos = 0;
    current_gaps = 0;
  }

  if  (hasNextData()) {
    switch(line[0]) {
    case '>': state=FASTX_FASTA; break;
    case '@': state=FASTX_FASTQ_ID; break;
    default: 
      throw invalid_argument("The file seems to be malformed!");
    }
    
    // Identifier line
    nb_sequences_parsed++;
    nb_sequences_returned++;
    current.label_full = line.substr(1);
    current.label = extract_from_label(current.label_full, extract_field, extract_separator);

    line = getInterestingLine();
    while (hasNextData() && ((state != FASTX_FASTA || line[0] != '>')
                         && (state != FASTX_FASTQ_QUAL || line[0] != '@'))) {

      if (hasNextData()) {
        switch(state) {
        case FASTX_FASTA: case FASTX_FASTQ_ID:
          // Sequence
          addLineToCurrentSequence(line);
          break;
        case FASTX_FASTQ_SEQ:
          // FASTQ separator between sequence and quality
          if (line[0] != '+')
            throw invalid_argument("Expected line starting with + in FASTQ file");
          break;
        case FASTX_FASTQ_SEP:
          // Reading quality
          current.quality = line;
          if (current.quality.length() != current.sequence.length())
            throw invalid_argument("Quality and sequence don't have the same length ");
          break;
        default:
          throw invalid_argument("Unexpected state after reading identifiers line");
        }
        if (state >= FASTX_FASTQ_ID && state <= FASTX_FASTQ_SEP)
          state = (fasta_state)(((int)state) + 1);
      } else {
        unexpectedEOF();
      }
      line = getInterestingLine(state);
    }

    if (state >= FASTX_FASTQ_ID && state < FASTX_FASTQ_QUAL) 
      unexpectedEOF();

    // Sequence in uppercase
    transform(current.sequence.begin(), current.sequence.end(), current.sequence.begin(), (int (*)(int))toupper);

    // Compute seq
    current.seq = new int[current.sequence.length()];
    for (unsigned int i=0; i< current.sequence.length(); i++)
      {
	current.seq[i] = nuc_to_int(current.sequence[i]) ;
      }

  } else
    unexpectedEOF();

  skipToNthSequence();
}

string OnlineFasta::getInterestingLine(int state) {
  string line;
  while (line.length() == 0 && hasNextData() && getline(*input, line)) {
    char_nb += line.length() + 1;
    remove_trailing_whitespaces(line);

    if (line.length() && line[0] == '#' && state != FASTX_FASTQ_SEP)
      line = "" ;
  }
  return line;
}

void OnlineFasta::unexpectedEOF() {
  throw invalid_argument("Unexpected EOF while reading FASTA/FASTQ file");
}

unsigned long long nb_sequences_in_fasta(string f, bool approx)
{
  if (approx)
    return approx_nb_sequences_in_fasta(f);

  OnlineFasta *sequences = new OnlineFasta(f, 1, " ");
  unsigned long long nb_sequences = 0 ;

  while (sequences->hasNext())
    {
      sequences->next();
      nb_sequences++ ;
    }

  cout << "  ==> " << nb_sequences << " sequences" << endl;

  delete sequences ;
  return nb_sequences ;
}


#define SAMPLE_APPROX_NB_SEQUENCES 200

unsigned long long approx_nb_sequences_in_fasta(string f)
{
  OnlineFasta *sequences = new OnlineFasta(f, 1, " ");
  int nb_sequences = 0 ;

  while (nb_sequences < SAMPLE_APPROX_NB_SEQUENCES && sequences->hasNext())
    {
      sequences->next();
      nb_sequences++ ;
    }

  cout << "  ==> " ;

  if (sequences->hasNext())
    {
      cout << "approx. " ;
      float ratio = (float) filesize(f.c_str()) / (float) sequences->getPos();
      nb_sequences = (unsigned long long) (ratio * nb_sequences);
    }

  cout << nb_sequences << " sequences" << endl;

  delete sequences ;
  return nb_sequences ;
}

