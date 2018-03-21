#!/usr/bin/python

import unittest
from gluon.globals import Request, Session, Storage, Response
from gluon.contrib.test_helpers import form_postvars
from gluon import current

class Sample_setController(unittest.TestCase):
        
    def __init__(self, p):
        global auth, session, request
        unittest.TestCase.__init__(self, p)
        
    def setUp(self):
        # Load the to-be-tested file
        execfile("applications/vidjil/controllers/sample_set.py", globals())
        # set up default session/request/auth/...
        global response, session, request, auth
        session = Session()
        request = Request({})
        auth = VidjilAuth(globals(), db)
        auth.login_bare("test@vidjil.org", "1234")
        
        # rewrite info / error functions 
        # for some reasons we lost them between the testRunner and the testCase but we need them to avoid error so ...
        def f(a, **kwargs):
            pass
        log.info = f
        log.error = f
        log.debug = f
        
        # for defs
        current.db = db
        current.auth = auth
        

    def testAll(self):
        request.vars["type"] = defs.SET_TYPE_GENERIC
        request.vars["id"] = fake_patient_id

        resp = all()
        self.assertTrue(resp.has_key('query'), "all() has returned an incomplete response" )

    def testIndex(self):
        request.vars["id"] = fake_sample_set_id
        
        resp = index()
        self.assertTrue(resp.has_key('query'), "info() has returned an incomplete response")
        
        
    def testCustom(self):
        resp = custom()
        self.assertTrue(resp.has_key('query'), "custom() has returned an incomplete response")

    def test1Permission(self):
        sample_set_id = db.patient[permission_patient].sample_set_id
        request.vars["id"] = sample_set_id

        resp = permission()
        self.assertTrue(resp.has_key('query'), "permission() has returned an incomplete response")


    def test2ChangePermission(self):
        patient = db.patient[permission_patient]
        sample_set_id = patient.sample_set_id
        request.vars["sample_set_id"] = sample_set_id
        request.vars["group_id"] = fake_group_id

        resp = change_permission()
        self.assertFalse(auth.get_group_access('patient', patient.id, fake_group_id), "fail to remove permission")

        resp = change_permission()
        self.assertTrue(auth.get_group_access('patient', patient.id, fake_group_id), "fail to add permission")

    def testForm(self):
        resp = form()
        self.assertTrue(resp.has_key('message'), "add() has returned an incomplete response")


    def test1Add(self):
        import json
        patient = {
            "first_name" : "bob",
            "last_name" : "bob",
            "birth" : "2011-11-11",
            "info" : "test patient kZtYnOipmAzZ",
            "id_label" : "bob"
        }
        data = {'patient':[patient], 'group': fake_group_id}

        request.vars['data'] = json.dumps(data)

        name = "%s %s" % (request.vars["first_name"], request.vars["last_name"])

        resp = submit()
        self.assertNotEqual(resp.find('patient %s added' % name), -1, "add patient failled")

    def testEdit(self):
        request.vars["id"] = fake_patient_id

        resp = form()
        self.assertTrue(resp.has_key('message'), "edit() has returned an incomplete response")

    def testEditForm(self):
        import json
        patient = {
            "id" : fake_patient_id,
            "first_name" : "bab",
            "last_name" : "bab",
            "birth" : "2010-10-10",
            "info" : "bab",
            "id_label" : "bab"
        }
        data = {'patient': [patient]}
        request.vars['data'] = json.dumps(data)

        resp = submit()
        self.assertNotEqual(resp.find('bab bab (1): patient edited"'), -1, "edit patient failed")
