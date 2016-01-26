#!/usr/bin/python
# -*- coding: utf-8 -*-
# TESTING FILE made.by.a.fox. 12.2.15
# Updated by acrule 01.21.16

#FEATURE LIST
#   Y   connect to db
#   Y   write to file
#   Y   Write JSON format
#       Accept input date parameter
#KNOWN ISSUES
#   2. no formatting or conversion of datetime stamps

import re
import os
import sys

import json
import sqlite3 as lite

import collections

import time
import datetime


db_file = os.path.expanduser('~/.traces/traces.sqlite')  #looks for db under ~/.traces
con = lite.connect(db_file)

with con:

    data = []  #master data container
    apps = []  #list of apps
    appevents = []  #list of application events
    exps = []  #list of experiences
    images = [] #list of screenshots
    words = [] #list of keywords

    cur = con.cursor()

    #SQL query strings
    appsSQL = "SELECT * FROM app"
    activeappSQL = "SELECT a.id, a.app_id, a.event, a.time as startt, min(b.time) AS endt FROM appevent a, appevent b WHERE a.app_id = b.app_id AND a.event = 'Active' AND b.event in ('Inactive', 'Close') AND a.time < b.time AND a.time IS NOT NULL AND b.time IS NOT NULL GROUP BY startt"
    experienceSQL = "SELECT * FROM experience"
    wordsSQL = "SELECT * FROM keys"

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

    #GET list of screenshots
    image_dir = os.path.expanduser('~/.traces/screenshots')  #looks for db under ~/.traces
    for y in os.listdir(image_dir):
        y_dir = os.path.join(image_dir,y)
        for m in os.listdir(y_dir):
            m_dir = os.path.join(y_dir, m)
            for d in os.listdir(m_dir):
                d_dir = os.path.join(m_dir, d)
                for h in os.listdir(d_dir):
                    h_dir = os.path.join(d_dir, h)
                    h_images = os.listdir(h_dir)
                    for image in h_images:
                        #make sure the file is an image
                        if image[-4:] == '.jpg':
                            i = collections.OrderedDict()
                            image_time = datetime.datetime.strptime(image[0:19], '%y%m%d-%H%M%S%f')
                            i['time'] = (image_time - datetime.datetime(1970,1,1)).total_seconds() + time.timezone #add timezone offset
                            i['image'] = os.path.join("screenshots", y, m, d, h, image)
                            images.append(i)

    #GET keywords
    cmd_rows = []
    new_line = ['Enter','Left','Right','Up','Down','Tab','Escape']
    starttime = 0.0
    app = 0
    window = 0
    s = ''

    cur.execute(wordsSQL)
    rows = cur.fetchall()
    for row in rows:
        if 'Cmd' in row[3]:
            cmd_rows.append(row)
        else:
            #keep writing the string if we're still on the same window
            text = str(row[2])
            if int(row[5]) == window: # and float(row[1]) - time <= 300.0:
                if text in new_line:
                    s += ' '
                elif text == 'Backspace':
                    s = s[:-1]
                else:
                    s += row[2]
            #if we've switched windows, look back at the frequent words
            else:
                keywords = re.compile('\w+').findall(s.lower())
                c = collections.Counter(keywords)

                # 100 most common english words (not sure if written or spoken)
                common = ['the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us']

                # remove most common english words and get most frequent ones remaining
                for word in list(c):
                    if word in common:
                        del c[word]
                top = [w for w, count in c.most_common(10) if w not in common]
                if len(top) > 0:
                    k = collections.OrderedDict()
                    k['time'] = starttime #datetime.datetime.fromtimestamp(starttime).strftime("%H:%M %m/%d/%y")
                    k['top'] = top
                    k['app'] = app
                    k['window'] = window
                    words.append(k)

                #reset tracking variables
                window = int(row[5])
                app = int(row[4])
                starttime = float(row[1])
                if text in new_line or text == 'Backspace':
                    s = ''
                else:
                    s = row[2]

    #ASSEMBLE apps and experince into json
    d = collections.OrderedDict()
    d['apps']=apps
    d['appevents']=appevents
    d['exps']=exps
    d['images']=images
    d['words']=words
    data = d
    #print json.dumps(data)

    #WRITE file
    file = 'extract.json'
    z = open(file,'w')
    z.writelines(json.dumps(data))
