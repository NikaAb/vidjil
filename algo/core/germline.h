
#ifndef GERMLINE_H
#define GERMLINE_H

#include <string>
#include <list>
#include "kmeraffect.h"
#include "kmerstore.h"
#include "stats.h"
#include "tools.h"

#define PSEUDO_GERMLINE_MAX12 "xxx"

using namespace std;

class Germline {
 private:
  int max_indexing;

  void init(string _code, char _shortcut,
            int _delta_min,
            int max_indexing);

 public:
  /*
   * @param delta_min: the minimal distance between the right bound and the left bound
   *        so that the segmentation is accepted
   *        (left bound: end of V, right bound : start of J)
   * @param max_indexing: maximal length of the sequence to be indexed (0: all)
   */

  Germline(string _code, char _shortcut,
           list <string> f_rep_5, list <string> f_rep_4, list <string> f_rep_3,
           int _delta_min,
            int max_indexing=0);

  Germline(string _code, char _shortcut, 
  	   string f_rep_5, string f_rep_4, string f_rep_3,
	   int _delta_min,
            int max_indexing=0);

  Germline(string _code, char _shortcut, 
      Fasta _rep_5, Fasta _rep_4, Fasta _rep_3,
	   int _delta_min,
            int max_indexing=0);

  Germline(string _code, char _shortcut,
	   int _delta_min,
            int max_indexing=0);

  ~Germline();

  string code ;
  char   shortcut ;

  void new_index(string seed);
  void set_index(IKmerStore<KmerAffect> *index);

  void update_index(IKmerStore<KmerAffect> *_index = NULL);

  void mark_as_ambiguous(Germline *other);
    
  list <string> f_reps_5 ;
  list <string> f_reps_4 ;
  list <string> f_reps_3 ;

  // KmerAffect affect_5 ;
  // KmerAffect affect_3 ;
  string affect_5 ;
  string affect_4 ;
  string affect_3 ;
  
  Fasta  rep_5 ;
  Fasta  rep_4 ;
  Fasta  rep_3 ;
  IKmerStore<KmerAffect> *index;

  int delta_min;
};


ostream &operator<<(ostream &out, const Germline &germline);


class MultiGermline {
 private:

 public:
  bool one_index_per_germline;
  list <Germline*> germlines;

  // A unique index can be used
  IKmerStore<KmerAffect> *index;

  MultiGermline(bool one_index_per_germline = true);
  ~MultiGermline();

  void insert(Germline *germline);
  void add_germline(Germline *germline, string seed);
  void build_default_set(string path, int max_indexing);
  void build_incomplete_set(string path, int max_indexing);

  // Creates and update an unique index for all the germlines
  // If 'set_index' is set, set this index as the index for all germlines
  void insert_in_one_index(IKmerStore<KmerAffect> *_index, bool set_index);
  void build_with_one_index(string seed, bool set_index);

  void mark_cross_germlines_as_ambiguous();
};

ostream &operator<<(ostream &out, const MultiGermline &multigermline);

#endif
