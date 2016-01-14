#!/usr/bin/python
# -*- coding: utf-8 -*-
# TESTING FILE made.by.a.fox. 12.2.15

#FEATURE LIST
#   Y   connect to db
#   Y   write to file
#   Y   Write JSON format
#       Accept input date parameter
#KNOWN ISSUES
#   2. no formatting or conversion of datetime stamps


import sqlite3 as lite
import os
import sys
import json
import collections


db_file = os.path.expanduser('~/.traces/traces.sqlite')  #looks for db under ~/.traces
con = lite.connect(db_file)


with con:

    data = []  #master data container
    apps = []  #list of apps
    appevents = []  #list of application events
    exps = []  #list of experiences

    cur = con.cursor()

    #SQL query strings
    appsSQL = "SELECT * FROM app"
    activeappSQL = "SELECT id,app_id,event,time as startt,(select min(time)from appevent b where a.app_id = b.app_id and b.event in ( 'Inactive' ,'Close')and a.time < b.time) as endt from appevent a	where a.event =  'Active'"
    experienceSQL = "SELECT * FROM experience"

    #GET list of applications
    cur.execute(appsSQL)
    rows = cur.fetchall()
    for row in rows:
        a = collections.OrderedDict()
        a['id'] = row[0]
        a['time'] = row[1]
        a['name'] = row[2]
        apps.append(a)

    #GET list intervals for primary application
    cur.execute(activeappSQL)
    rows = cur.fetchall()
    print len(rows)
    for row in rows:
        a = collections.OrderedDict()
        a['id'] = row[0]
        a['appid'] = row[1]
        a['event'] = row[2]
        a['start'] = row[3]
        a['end'] = row[4]
        appevents.append(a)


    #GET list of experiences
    cur.execute(experienceSQL)
    rows = cur.fetchall()
    for row in rows:
        a = collections.OrderedDict()
        a['id'] = row[0]
        a['text'] = row[2]
        exps.append(a)

    #ASSEMBLE apps and experince into json
    d = collections.OrderedDict()
    d['apps']=apps
    d['appevents']=appevents
    d['exps']=exps
    data = d
    print json.dumps(data)

    #WRITE file
    file = 'extract.json'
    z = open(file,'w')
    z.writelines(json.dumps(data))
