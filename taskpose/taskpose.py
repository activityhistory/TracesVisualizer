"""
Adam Rule
December 8, 2015

Calculate window rank and window association with Taskpose methods
http://hci.stanford.edu/publications/2008/taskpose/taskpose-uist08.pdf

Note, my implementation of these algorithms seems very inefficient, so they are
probably incorrect
"""

import os
import ast
import sqlite3
import time
import datetime

from PIL import Image, ImageDraw

# [{'window_number':32, app_number:1, 'name':'Cool window name', 'image':'image.jpg', 'total_time': 128.0, rank:1.2, 'activations':[[start, stop], [start, stop]]},]

def connect_to_db(db):
    # connect to the database and get a cursor ready
    conn = sqlite3.connect(db)
    return conn.cursor()

def get_window_data(cursor):
    # get a list of the window names
    #TODO add tracking of associated application
    cursor.execute('SELECT * FROM window')
    return [w[2] for w in cursor.fetchall()]

def get_window_activation_sequence(cursor):
    # query the database for a list window activation events
    start_time = (datetime.datetime(2015, 12, 9) - datetime.datetime(1970, 1, 1)).total_seconds() # - 8*60*60
    end_time = start_time + 24*60*60

    print start_time
    print end_time

    cursor.execute('SELECT * FROM windowevent WHERE time BETWEEN ' + str(start_time) + ' and ' + str(end_time))
    events = cursor.fetchall()
    print events

    active_windows = {}
    activation_sequence = []
    for e in events:
        time = float(e[1])
        event_type = e[2]
        win = int(e[3])

        # made assumptions here that a window may have nested activations
        # e.g. get have two activations followed by two inactivations
        # in which case we just tracker the outer times
        # and always has an Inactive event
        if event_type == 'Active':
            if win not in active_windows.keys():
                d = {'start': time , 'active': 1}
                active_windows[win] = d
            else:
                active_windows[win]['active'] += 1
        elif event_type == 'Inactive':
            if active_windows[win]['active'] > 1:
                active_windows[win]['active'] -= 1
            elif active_windows[win]['active'] == 1:
                activation_sequence.append([active_windows[win]['start'], time, win])
                del active_windows[win]
    return activation_sequence

def get_unique_windows(activation_sequence):
    window_numbers = []
    for activation in activation_sequence:
        if activation[2] not in window_numbers:
            window_numbers.append(activation[2])
    window_numbers.sort()
    return window_numbers

def get_window_rank_association(activation_sequence, window_numbers):
    num_windows = len(window_numbers)
    switches = [[0 for i in range(num_windows)] for j in range(num_windows)]
    window_stats = {win:{'name':window_names[win-1], 'time': 0.0, 'rank': 1.0}  for win in window_numbers}

    last_active = None
    for activation in activation_sequence:
        # get the data for this activation
        start = activation[0]
        end = activation[1]
        window_number = activation[2]

        # track total time spent in window
        window_stats[window_number]['time'] += (end - start)

        # track window switches
        if last_active:
            last_index = window_numbers.index(last_active)
            current_index = window_numbers.index(window_number)
            switches[last_index][current_index] += 1

            # update window ranks for all windows via Taskpose method
            #TODO figure out why this zeros out so often
            for a in range(num_windows):
                new_rank_sum = 0.0
                for x in range(num_windows):
                    if x != a:
                        old_rank = window_stats[window_numbers[x]]['rank']
                        switch_xa = switches[x][a]
                        switch_xy = sum(switches[x])
                        # print switch_xa
                        if switch_xy > 0:
                            new_rank_sum += (old_rank * float(switch_xa)/switch_xy)
                        # print x, a, new_rank_sum
                if new_rank_sum > 0.0:
                    window_stats[window_numbers[a]]['rank'] = new_rank_sum

        last_active = window_number

    # get taskpose association rank
    associations = [[0.0 for i in range(num_windows)] for j in range(num_windows)]
    for a in range(num_windows):
        for b in range(num_windows):
            if b > a:
                switch_ab = switches[a][b]
                switch_ax = sum(switches[a])
                rank_a = window_stats[window_numbers[a]]['rank']
                rank_b = window_stats[window_numbers[b]]['rank']
                if switch_ax > 0 and (rank_a + rank_b) > 0:
                    associations[a][b] = (switch_ab / switch_ax) * (rank_a / (rank_a + rank_b))

    return switches, associations, window_stats

def get_window_images(cursor, activation_sequence, window_numbers, window_names):
    # get the longest active time for each window
    longest_activation = [[0.0, 0.0, window] for window in window_numbers]
    for activation in activation_sequence:
        index = window_numbers.index(activation[2])
        if (activation[1] - activation[0]) > longest_activation[index][1] - longest_activation[index][0]:
             longest_activation[index][1] = activation[1]
             longest_activation[index][0] = activation[0]

    # query database for next arrangement and find window geometry
    for longest in longest_activation:
        query = cursor.execute('SELECT * FROM arrangement WHERE time >= ' + str(longest[0]) + ' LIMIT 1') # WHERE time >= ' + str(longest[0]))
        q = query.fetchone()
        arrangement = ast.literal_eval(q[2])
        for app_key, app_value in arrangement.iteritems():
            for window_key, window_value in app_value['windows'].iteritems():
                if window_value['wid'] == longest[2]:
                    longest.append(window_value['bounds'])

        # find the nearest image
        # convert start time to datetime
        local_time = longest[0] - 60*60*8 # cut back 8 hours to utc time

        filename = datetime.datetime.utcfromtimestamp(local_time).strftime("%y%m%d-%H%M%S%f")
        y = filename[0:2]
        m = filename[2:4]
        d = filename[4:6]
        h = filename[7:9]
        M = filename[9:11]
        S = filename[11:13]
        f = filename[13:19]
        folder = os.path.join("/Users/adamrule/.traces/screenshots",y,m,d,h)

        x1 = longest[3]['x']
        y1 = longest[3]['y']
        x2 = longest[3]['x'] + longest[3]['width']
        y2 = longest[3]['y'] + longest[3]['height']

        images = os.listdir(folder)
        for image in images:
            if int(image[9:19]) >= int(M + S + f):
                im = Image.open(os.path.join(folder,image))
                draw = ImageDraw.Draw(im)
                draw.rectangle([x1, y1, x2, y2], outline=128)
                im.save("/Users/adamrule/Desktop/windows/" +str(longest[2]) + ".png")
                break

        # path = os.path.join(folder,""+filename+".jpg")

        # draw a rectangle on that image given the coordinates
        # save that image to a new file

# run the thing
c = connect_to_db('/Users/adamrule/.traces/traces.sqlite')
window_names = get_window_data(c)
activation_sequence = get_window_activation_sequence(c)
window_numbers = get_unique_windows(activation_sequence)
switches, associations, window_stats = get_window_rank_association(activation_sequence, window_numbers)

get_window_images(c, activation_sequence, window_numbers, window_names)

# get list of keywords
