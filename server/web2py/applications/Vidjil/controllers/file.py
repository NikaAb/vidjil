# coding: utf8

def add(): 
    import gluon.contrib.simplejson
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    if auth.has_permission('admin', 'patient', request.vars['id'], auth.user_id):
        return dict(message=T('add file'))
    else :
        res = {"success" : "false", "message" : "you need admin permission on this patient to add file"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


#TODO check data
def add_form(): 
    import gluon.contrib.simplejson, shutil, os.path, datetime
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
        
    id = db.sequence_file.insert(data_file = request.vars.file)
    error = ""
    
    if request.vars['sampling_date'] != None :
        try:
            datetime.datetime.strptime(""+request.vars['sampling_date'], '%Y-%m-%d')
        except ValueError:
            error += "date missing or wrong format, "
            
    ##if not auth.has_permission('admin', 'patient', request.vars['patient_id'], auth.user_id):
    ##    error += "you need admin permission on this patient to add file"
    
    if error=="" :
        
        db.sequence_file[id] = dict(sampling_date=request.vars['sampling_date'],
                                    info=request.vars['file_info'],
                                    patient_id=request.vars['patient_id'])
    
        res = {"redirect": "patient/index",
               "message": "file added"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
        
    else :
        res = {"success" : "false", "message" : error}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))


def edit(): 
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('edit file'))


#TODO check data
def edit_form(): 
    import gluon.contrib.simplejson, shutil, os.path, datetime
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    
    error = ""
    try:
        datetime.datetime.strptime(""+request.vars['sampling_date'], '%Y-%m-%d')
    except ValueError:
        error += "sampling date missing or wrong format"

    if error=="" :
        db.sequence_file[request.vars["id"]] = dict(sampling_date=request.vars['sampling_date'],
                                                info=request.vars['file_info'])
            
        res = {"redirect": "patient/index",
       "message": "change saved"}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))

    else :
        res = {"success" : "false", "message" : error}
        return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
  

def confirm():
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400
    return dict(message=T('confirm sequence file deletion'))
        

def delete():
    import gluon.contrib.simplejson, shutil, os.path
    if request.env.http_origin:
        response.headers['Access-Control-Allow-Origin'] = request.env.http_origin  
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = 86400

    db(db.sequence_file.id == request.vars["id"]).delete()
    db(db.data_file.sequence_file_id == request.vars["id"]).delete()
    
    res = {"redirect": "patient/index",
           "message": "sequence file deleted"}
    return gluon.contrib.simplejson.dumps(res, separators=(',',':'))
