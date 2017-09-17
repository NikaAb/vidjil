#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''Get from NCBI CD sequences from the HCDM database (hcdm.org), as exported by HGNC (genenames.org)'''

import urllib

HUGO_REQUEST = 'http://www.genenames.org/cgi-bin/download?'
HUGO_COLS = '&col=gd_hgnc_id&col=md_refseq_id&col=gd_other_ids_list&col=gd_app_sym&col=gd_app_name&col=gd_status&col=gd_prev_sym&col=gd_aliases&col=gd_pub_chrom_map&col=gd_pub_acc_ids&col=gd_pub_refseq_ids'

# HUGO query on 'hcdm.org' entries
HUGO_QUERY = '&status=Approved&status=Entry+Withdrawn&status_opt=2&where=gd_other_ids+LIKE+%27%25hcdm.org%25%27&order_by=gd_app_sym_sort&format=text&limit=&hgnc_dbtag=on&submit=submit'

HUGO_URL = HUGO_REQUEST + HUGO_COLS + HUGO_QUERY

NCBI_API = 'http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nuccore&rettype=fasta&retmode=text'+'&id=%s'

# Common CD used to sort cells, see https://en.wikipedia.org/wiki/Cluster_of_differentiation
SORTING_CD = [ 'CD3g', 'CD3d', 'CD3e', 'CD4', 'CD8a', 'CD8b', 'CD11a', 'CD11b', 'CD14', 'CD15', 'CD16a', 'CD16b', 'CD19', 'CD20', 'CD22', 'CD24', 'CD25', 'CD30', 'CD31', 'CD34', 'CD38', 'CD45', 'CD56', 'CD61', 'CD91', 'CD114', 'CD117', 'CD182' ]

OUT = 'homo-sapiens/CD.fa'

SORTING_OUT = 'homo-sapiens/CD-sorting.fa'

print "==>", OUT
out = open(OUT, 'w')

print "==>", SORTING_OUT
sorting_out = open(SORTING_OUT, 'w')

for l in urllib.urlopen(HUGO_URL).readlines():
    ll = l.split('\t')

    try:
        hugo, ncbi, ids = ll[0], ll[1], ll[2]
        cd_id = ids.split(',')[2].strip()
    except:
        print "!", l
        continue
        
    print cd_id, hugo, ncbi 
    
    fasta = urllib.urlopen(NCBI_API % ncbi).read()
    fasta_with_id = fasta.replace('>', '>%s|%s|' % (hugo, cd_id))    

    out.write(fasta_with_id)

    if cd_id in SORTING_CD:
        sorting_out.write(fasta_with_id)
    

