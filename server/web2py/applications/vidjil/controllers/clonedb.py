# coding: utf8
import gluon.contrib.simplejson, datetime
import vidjil_utils
import time
import os
import sys
import imp

if request.env.http_origin:
    response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = 86400


def index():
    '''
    The request should receive two parameters:
    - sequences: a list of comma-separated DNA sequences to be searched in the CloneDB
    - sample_set_id: the sample set we're coming from
    '''
    if not auth.user:
        return response.json({'error': 'Access denied'})

    if request.vars['sequences'] == None or request.vars['sequences'] == ''\
       or request.vars['sample_set_id'] == None:
        return response.json({'error': 'Malformed request'})

    return search_clonedb(request.vars['sequences'].split(','), int(request.vars['sample_set_id']))

def search_clonedb(sequences, sample_set_id):
    sys.path.insert(1, os.path.abspath(defs.DIR_CLONEDB))
    import grep_clones
    clonedb = imp.load_source('clonedb', defs.DIR_CLONEDB+os.path.sep+'clonedb.cgi')

    results = []
    for sequence in sequences:
        options = clonedb.build_grep_clones_options({'sequence': sequence+' -sample_set:%d' % sample_set_id})
        args = grep_clones.parser.parse_args(options)
        log.debug(args)
        occurrences = grep_clones.launch_search(args)
        for occ in occurrences:
            if 'tags' in occ and 'sample_set' in occ['tags']:
                info = get_info_of_viewable_sample_set([int(sample_id) for sample_id in occ['tags']['sample_set']], int(occ['tags']['config_id'][0]))
                occ['tags']['sample_set_viewable'] = info['viewable']
                occ['tags']['sample_set_name'] = info['name']
                config_db = db.config[occ['tags']['config_id'][0]]
                occ['tags']['config_name'] = [config_db.name if config_db else None]
        results.append(occurrences)
    return response.json(results)

def get_info_of_viewable_sample_set(sample_sets, config):
    info = {'viewable': [], 'name': []}
    for sample_id in sample_sets:
        viewable = auth.can_view_sample_set(sample_id, auth.user)
        info['viewable'].append(viewable)
        if viewable:
            info['name'].append(get_sample_name(sample_id))
        else:
            info['name'].append(None)
    return info
