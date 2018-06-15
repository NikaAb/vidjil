#ifndef FILTER_H
#define FILTER_H
#include "bioreader.hpp"
#include "automaton.hpp"

/*
  This function will filter a BioReader
  @param idxAho:  A pointer to a pair containing an int vector pointer and
                  an AbstractACAutomaton pointer parametrized by KmerAffect.
                  The int vector represents indexes of a BioReader and the
                  automaton is build with single char labels put in KmerAffect.
                  To know more about them, read doc of
                  buildACAutomatonToFilterBioReader function.

  @param origin : The BioReader object we want to filter.
  @param seq :    The sequence that will be aligned against the genes.
  @param kmer_threshold : The threshold to K-mers used during the filtering.
                  Since it's an optional arguments, if not specified it will
                  filter on every K-mers returned by getMultiResults. Otherwise
                  it will filter on the "kmer_threshold" number of K-mers. For
                  Example if kmer_threshold = 10, it will filter on the 10 most
                  significant K-mers returned by getMultiResults
*/
BioReader filterBioReaderWithACAutomaton(
    pair<vector<int>*, AbstractACAutomaton<KmerAffect>*>* idxAho,
    BioReader &origin, seqtype &seq,
    int kmer_threshold = NO_LIMIT_VALUE);

/*
  This function takes a BioReader as a parameter and returns
  a couple containing an int vector pointer and an automaton
  object pointer specifying the automaton used..
  For now the automaton used is Aho-Corasick but to prevent future
  errors the returned type is an AbstractACAutomaton. The index
  vector contains the indexes of the genes families.
  For example if the BioReader has the following genes:
  IGHV-01*01  (index 0) (New Family !)
  IGHV-02*01  (index 1) (New Family !)
  IGHV-02*02  (index 2)
  IGHV-03*01  (index 3) (New Family !)
  IGHV-03*02  (index 4)
  IGHV-03*03  (index 5)
  IGHV-03*04  (index 6)
  IGHV-04*04  (index 7) (New Family !)
  IGHV-05*01  (index 8) (New Family !)
  IGHV-05*02  (index 9)
  The following vector<int> is returned :
  [0, 1, 3, 7, 8, 9]
  Note :  The first case always contains the number '0' and the last one
          contains the number of genes in the BioReader (minus 1).
  Regarding the automaton, it is built using KmerAffect. We take these
  Kmer because they can handle informations on a character. We set a
  different character to a Kmer for each group of genes.
  For example we will build the automaton using the KmerAffect like this:
  KmerAffect_0's label = 'a'  (New Family !)
  KmerAffect_1's label = 'b'  (New Family !)
  KmerAffect_2's label = 'b'
  KmerAffect_3's label = 'c'  (New Family !)
  KmerAffect_4's label = 'c'
  KmerAffect_5's label = 'c'
  KmerAffect_6's label = 'c'
  KmerAffect_7's label = 'd'  (New Family !)
  KmerAffect_8's label = 'e'  (New Family !)
  There is no KmerAffect_9's because as said previously, the last number
  in the vector<index> represent the total number of genes, and not a
  family itself.
  In the previous example KmerAffectX's label start from 'a' (n°97 in ascii
  chart), but in reality to store more informations, the label start from
  the ascii character NUL (n°0 in ascii chart) and increase for each new
  family of genes met.
  Note :  There is no ascii character for '_', '?' and '*' since they
  respectively represent an "AFFECT_UNKNOWN_SYMBOL", an "AFFECT_AMBIGUOUS_SYMPBOL"
  and an "AFFECT_NOT_UNKNOWN_SYMBOL".
  The param "seed" is used while inserting sequences in the automaton. By default
  the seed has a size of 10.
*/
pair<vector<int>*, AbstractACAutomaton<KmerAffect>*>*
buildACAutomatonToFilterBioReader(BioReader &origin, string seed);
#endif
