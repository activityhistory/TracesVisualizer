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
    windows = [] # list of windows
    urls = []
    appevents = []  #list of application events
    windowevents = [] #list of window events
    urlevents = []
    exps = []  #list of experiences
    images = [] #list of screenshots
    words = [] #list of keywords

    cur = con.cursor()

    #SQL query strings
    appsSQL = "SELECT * FROM app"
    windowsSQL = "SELECT * FROM window"
    urlSQL = "SELECT * FROM url"
    activeappSQL = "SELECT a.id, a.app_id, a.event, a.time as startt, min(b.time) AS endt FROM appevent a, appevent b WHERE a.app_id = b.app_id AND a.event = 'Active' AND b.event in ('Inactive', 'Close') AND a.time < b.time AND a.time IS NOT NULL AND b.time IS NOT NULL GROUP BY startt"
    activewindowSQL = "SELECT a.id, a.window_id, a.event, a.time as startt, min(b.time) AS endt FROM windowevent a, windowevent b WHERE a.window_id = b.window_id AND a.event = 'Active' AND b.event in ('Inactive', 'Close') AND a.time < b.time AND a.time IS NOT NULL AND b.time IS NOT NULL GROUP BY startt"
    activeurlSQL = "SELECT a.id, a.url_id, a.app_id, a.window_id, a.event, a.time as startt, min(b.time) AS endt FROM urlevent a, urlevent b WHERE a.url_id = b.url_id AND a.window_id = b.window_id AND a.app_id = b.app_id AND a.event = 'Active' AND b.event in ('Inactive', 'Close') AND a.time < b.time AND a.time IS NOT NULL AND b.time IS NOT NULL GROUP BY startt"
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

    #GET list of windows
    cur.execute(windowsSQL)
    rows = cur.fetchall()
    for row in rows:
        w = collections.OrderedDict()
        w['id'] = row[0]
        w['time'] = row[1]
        w['name'] = row[2]
        w['app'] = row[3]
        windows.append(w)

    #GET list of urls
    cur.execute(urlSQL)
    rows = cur.fetchall()
    for row in rows:
        u = collections.OrderedDict()
        u['id'] = row[0]
        u['time'] = row[1]
        u['title'] = row[2]
        u['url'] = row[3]
        u['host'] = row[4]
        urls.append(u)

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

    #GET list intervals for primary window
    cur.execute(activewindowSQL)
    rows = cur.fetchall()
    for row in rows:
        w = collections.OrderedDict()
        w['id'] = row[0]
        w['windowid'] = row[1]
        w['appid'] = (item for item in windows if item["id"] == row[1]).next()['app']
        w['event'] = row[2]
        w['start'] = row[3]
        w['end'] = row[4]
        windowevents.append(w)

    #GET list intervals for urls
    cur.execute(activeurlSQL)
    rows = cur.fetchall()
    for row in rows:
        u = collections.OrderedDict()
        u['id'] = row[0]
        u['urlid'] = row[1]
        u['appid'] = row[2]
        u['windowid'] = row[3]
        u['event'] = row[4]
        u['start'] = row[5]
        u['end'] = row[6]
        urlevents.append(u)

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
        if not os.path.isdir(y_dir):
            continue
        for m in os.listdir(y_dir):
            m_dir = os.path.join(y_dir, m)
            if not os.path.isdir(m_dir):
                continue
            for d in os.listdir(m_dir):
                d_dir = os.path.join(m_dir, d)
                if not os.path.isdir(d_dir):
                    continue
                for h in os.listdir(d_dir):
                    h_dir = os.path.join(d_dir, h)
                    if not os.path.isdir(h_dir):
                        continue
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
    newWord = ['Enter','Left','Right','Up','Down','Tab','Escape', ' ']
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
            text = str(row[2])
            # if its a char indicating a new word, save our text token
            if text in newWord:
                # save our data
                if len(s) > 0:
                    k = collections.OrderedDict()
                    k['time'] = starttime #datetime.datetime.fromtimestamp(starttime).strftime("%H:%M %m/%d/%y")
                    k['text'] = s #just pass the whole string for now
                    k['app'] = app
                    k['window'] = window
                    words.append(k)

                #reset tracking time
                starttime = float(row[1])
                s = ''

            # if its a regular char on the same window, just keep building the string
            elif int(row[5]) == window: # and float(row[1]) - time <= 300.0:
                if text == 'Backspace':
                    s = s[:-1]
                else:
                    s += row[2]
            #else its a regular char but we switched windows, save the data
            else:
                if len(s) > 0:
                    k = collections.OrderedDict()
                    k['time'] = starttime #datetime.datetime.fromtimestamp(starttime).strftime("%H:%M %m/%d/%y")
                    k['text'] = s #just pass teh whole string for now
                    k['app'] = app
                    k['window'] = window
                    words.append(k)

                #reset tracking variables
                window = int(row[5])
                app = int(row[4])
                starttime = float(row[1])

                #write the character to start the next word
                if text in newWord or text == 'Backspace':
                    s = ''
                else:
                    s = row[2]

    #ASSEMBLE apps and experince into json
    d = collections.OrderedDict()
    d['apps']=apps
    d['window']=windows
    d['url']=urls
    d['appevents']=appevents
    d['windowevents']=windowevents
    d['urlevents']=urlevents
    d['exps']=exps
    d['images']=images
    d['words']=words
    data = d

    #WRITE file
    file = 'extract.json'
    z = open(file,'w')
    z.writelines(json.dumps(data))
