"""
Adam Rule
December 1, 2015

Short scripts to extract keywords from body of text, calculate kpm, and wpm
from csv file of Traces keystrokes. This is a hack of my (Adam's) personal data-
set and needs refactoring before it can be generalized
"""


import re
from collections import Counter

import csv
import time
import datetime


# get the time limits of the data we want to look at
today = datetime.datetime(2015, 12, 1)
yesterday = datetime.datetime(2015, 11, 30)
# hack of adjusting for time difference
today_timestamp = (today - datetime.datetime(1970, 1, 1)).total_seconds() + 8*60*60
yesterday_timestamp = (yesterday - datetime.datetime(1970, 1, 1)).total_seconds() + 8*60*60

def getWords(text):
    return re.compile('\w+').findall(text)

def getKeywords():
    with open('keys.csv', 'rb') as csvfile:
        reader = csv.reader(csvfile, delimiter=',')
        next(reader)  # skip header row

        # set up variables for the loop
        cmd_rows = []
        new_line = ['Enter','Left','Right','Up','Down','Tab','Escape']
        time = ''
        app = 0
        window = 0
        s = ''
        apps = ['Finder','Evernote','Google Chrome','Terminal','Chrome','Atom','TextEdit','Skype','KeePassX','System Preferences','SQLPro for SQLite Read-Only','Console','Activity Monitor']
        windows = ['parse words from string python - Google Search', 'Evernote Basic', '__NSTextViewCompletionWindow', 'Python: count frequency of words in a list - Stack Overflow', 'python - Converting a String to a List of Words? - Stack Overflow', 'New Tab', 'python get most unique words in string - Google Search', 'How to return unique words from the text file using Python - Stack Overflow', 'untitled - Atom', 'python word count - Google Search', 'words.py - /Users/adamrule/Code/traces - Atom', 'Terminal \\u2014 login \\u2014 80\\u00d724', '"Extracting words from a string, removing punctuation and returning a list with separated words in Python - Stack Overflow"', 'a tale of two cities - Google Search', 'www.gutenberg.org/ebooks/98', 'A Tale of Two Cities by Charles Dickens - Free Ebook', '"A Tale of Two Cities, by Charles Dickens"', 'Desktop \\u2014 -bash \\u2014 101\\u00d729', 'python convert to ascii - Google Search', 'Python - Unicode to ASCII conversion - Stack Overflow', 'what is \\xe2 - Google Search', "python - how to remove '\\xe2' from a list - Stack Overflow", '100 most common words - Google Search', 'python counter - Google Search', 'Genesis 1 - ESVBible.org', 'strip non ascii characters python - Google Search', 'https://www.google.com/search?q=SyntaxError%3A+Non-ASCII+character+%27%5Cxe2%27+in+file+words.py+on+line+10%2C+but+no+encoding+declared%3B+see+http%3A%2F%2Fpython.org%2Fdev%2Fpeps%2Fpep-0263%2F+for+details&oq=SyntaxError%3A+Non-ASCII+character+%27%5Cxe2%27+in+file+words.py+on+line+10%2C+but+no+encoding+declared%3B+see+http%3A%2F%2Fpython.org%2Fdev%2Fpeps%2Fpep-0263%2F+for+details&aqs=chrome..69i57j69i58.412j0j7&sourceid=chrome&es_sm=91&ie=UTF-8', '"SyntaxError: Non-ASCII character \'\\xe2\' in file words.py on line 10, but no encoding declared; see http://python.org/dev/peps/pep-0263/ for details - Google Search"', 'python - SyntaxError of Non-ASCII character - Stack Overflow', 'python counter get top values excluding - Google Search', 'python - excluding words from collections.counter using top ten - Stack Overflow', 'python counter most common - Google Search', 'Counter - Python Module of the Week', 'python dictionary highest values - Google Search', 'python - Getting key with maximum value in dictionary? - Stack Overflow', '8.3. collections \\u2014 High-performance container datatypes \\u2014 Python 2.7.11rc1 documentation', 'python .lower() - Google Search', '7.1. string \\u2014 Common string operations \\u2014 Python 2.7.11rc1 documentation', 'python counter most common exclude - Google Search', 'python - Exclude list of words when reading a file - Stack Overflow', 'python - How do I remove entries within a Counter object with a loop without invoking a RuntimeError? - Stack Overflow', 'Adam Rule', 'Open', 'index.html - /Users/adamrule/Code/traces - Atom', 'acrule.github.com', 'Untitled', 'Adam Rule Research', 'Adam Rule CV', 'research.html - /Users/adamrule/Code/acrule.github.com - Atom', 'Activity Histories', 'Google', 'amia validating free text order entry - Google Search', 'Validating Free-text Order Entry for a Note-centric EHR | AMIA Knowledge Center', 'AMIA 2015 Annual Symposium - Session Details', 'AMIA 2015 Annual Symposium | AMIA Knowledge Center', 'Terminal \\u2014 login \\u2014 101\\u00d729', 'Data work in Healthcare', 'Google Drive', 'My Drive - Google Drive', 'resuming_scientific_writing_study_proposal - Google Docs', 'untitled - /Users/adamrule/Code/traces - Atom', 'adamrule \\u2014 login \\u2014 80\\u00d724', 'adamrule \\u2014 -bash \\u2014 80\\u00d724', 'Desktop \\u2014 -bash \\u2014 80\\u00d724', 'what is \\\\xe2 - Google Search', "python - how to remove '\\\\xe2' from a list - Stack Overflow", '"Most common words in English - Wikipedia, the free encyclopedia"', 'text - How can I remove non-ASCII characters but leave periods and spaces using Python? - Stack Overflow', '"SyntaxError: Non-ASCII character \'\\\\xe2\' in file words.py on line 10, but no encoding declared; see http://python.org/dev/peps/pep-0263/ for details - Google Search"', 'python - How to find most common elements of a list? - Stack Overflow', 'cv.html - /Users/adamrule/Code/acrule.github.com - Atom', 'index.html - /Users/adamrule/Code/acrule.github.com - Atom', 'acrule.github.com \\u2014 -bash \\u2014 101\\u00d729', 'Gmail', 'Inbox - acrule@gmail.com - Gmail', 'Skype', '"Google Calendar - Week of Nov 29, 2015"', 'adam_database - KeePassX', 'Inbox (1) - acrule@gmail.com - Gmail', '"Fwd: 2016 Health-Care Symposium: Submit Proposals, Book Accommodations - acrule@gmail.com - Gmail"', 'where is findersyncapiextension el capitan - Google Search', 'OS X asks Where is FinderSyncAPIExtension on st... | Apple Support Communities', 'Human Factors and Ergonomics Society: 2016 International Health-Care Symposium', 'https://calendar.google.com/calendar/render', 'Human Factors and Ergonomics Society: 2016 International Health Care Symposium', 'Inbox (2) - acrule@gmail.com - Gmail', 'Example based learning - acrule@gmail.com - Gmail', 'Chat about ED research - acrule@gmail.com - Gmail', 'HCS 2016', 'Themes and Background', 'https://mail.google.com/mail/u/0/', 'Inbox (3) - acrule@gmail.com - Gmail', 'Shadowing in the ED - acrule@gmail.com - Gmail', 'Inbox (11) - acrule@gmail.com - Gmail', 'Google Calendar', 'cameras - acrule@gmail.com - Gmail', 'css font - Google Search', 'CSS Fonts', 'You + me + 30 mins + Science = ME SO GRATEFUL - acrule@gmail.com - Gmail', 'https://www.google.com/search?q=foley+catheter&oq=foley+catheter&aqs=chrome..69i57.3466j0j7&sourceid=chrome&es_sm=91&ie=UTF-8 is not available', 'foley catheter - Google Search', 'time in texas - Google Search', 'Google Calendar - Event Details', 'krankenwagen - Google Search', 'Home - BBC News', '"The New York Times - Breaking News, World News & Multimedia"', 'Meet Tumblr\\u2019s 15-Year-Old Secret Keeper - The New York Times', 'https://mail.google.com', 'meeting_notes - Google Drive', '2015_09_21_workshop_writeup - Google Docs', 'peer_review', 'Word Count Tool - A Free Word Counter', 'Healthcare posteter due 5 PM. See note - acrule@gmail.com - Gmail', 'Christmas gifts for Mom and Dad - acrule@gmail.com - Gmail', 'Untitled document - Google Docs', 'nadir weibel ucsd - Google Search', 'Nadir Weibel - Home', 'Design Lab \\u2013 UC San Diego', 'todd pawlicki - Google Search', '"Todd Pawlicki, PhD FAAPM - Dept. of Radiation Medicine - UCSD School of Medicine"', 'Department of Radiation Medicine - UC San Diego School of Medicine', 'Contact Us - Department of Radiation Medicine - UCSD School of Medicine', 'Copyright', 'submissions.mirasmart.com/HCS2016/ViewPDF.asp?sbmID=202', 'submissions.mirasmart.com/Verify/HCS2016/submission/temp/rad54EAA.pdf', 'Fwd: critique workshop - things to bring! - acrule@gmail.com - Gmail', 'submissions.mirasmart.com/Verify/HCS2016/submission/temp/radD918D.pdf', '12/2/15 Studio Session with Michael Meyer - acrule@gmail.com - Gmail', 'ucsd bookstore - Google Search', 'The Art of Manliness', 'Desiring God', 'Mr. Money Mustache \\u2014 Early Retirement through Badassity', 'Come judge some final presentations! - acrule@gmail.com - Gmail', 'Square Cash', 'Welcome to Cash! - acrule@gmail.com - Gmail', 'Square Cash - Edit Your Profile', '2065 diamond street - Google Search', '"Online Banking, CDs, Money Market, Savings & Checking | Ally"', 'Login | Ally', 'Summary | Accounts | Ally', 'square.me invalid zip - Google Search', '"Square Support on Twitter: ""@erikkerber Can you please DM me a good email address to reach you at, so that I can follow up with more info and troubleshooting tips."""', 'Square Support (@SqSupport) | Twitter', 'Square Cash Support', 'Square Cash Troubleshooting', 'Supported Cards with Square Cash', 'Personal Information | Profile | Ally', 'Square Cash Settings and Activity', 'Ally Bank', 'Security Code Delivery | Profile | Ally', 'Privacy Preferences | Profile | Ally', 'Square Cash - Activity', 'Ally Bank | Logged-off', 'lg g watch - Google Search', 'LG G Watch R | powered by android wear', 'LG G Watch | powered by android wear', 'LG G Watch in Black W100: Android Wear Smart Watch | LG USA', 'Dear My Blank: Archive', 'Kathlena Rule says...', 'adam_database.kdbx - KeePassX', 'Network', '2015_08_24_workshop_writeup - Google Docs', 'hfes_poster_proposal - Google Docs', '"Square Support on Twitter: \\""@erikkerber Can you please DM me a good email address to reach you at, so that I can follow up with more info and troubleshooting tips.\\"""', 'app_parser.py - /Users/adamrule/Code/traces - Atom', 'All Messages', 'dist', '.traces', 'traces.sqlite', 'traces \\u2014 -bash \\u2014 135\\u00d735', 'Home \\u2013 Rdio', 'python - Malformed String ValueError ast.literal_eval() with String representation of Tuple - Stack Overflow', 'Activity Monitor (All Processes)', 'screenshots', 'logs', 'key.log']

        # run through the file
        for row in reader:
            if 'Cmd' in row[3]:
                cmd_rows.append(row)
            else:
                if int(row[5]) == window and float(row[1]) - time <= 300.0:
                    text = str(row[2])
                    if text in new_line:
                        s += ' '
                    elif text == 'Backspace':
                        s = s[:-1]
                    else:
                        s += row[2]
                else:
                    words = getWords(s.lower())
                    c = Counter(words)

                    # 100 most common english words (not sure if written or spoken)
                    common = ['the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us']

                    # remove most common words
                    for word in list(c):
                        if word in common:
                            del c[word]

                    top_ten = [w for w, count in c.most_common(7) if w not in common]
                    if len(top_ten) >= 3:
                        print datetime.datetime.fromtimestamp(time).strftime("%H:%M %m/%d/%y")
                        print apps[app-1] + ': ' + windows[window-1]
                        print top_ten
                        print
                    window = int(row[5])
                    app = int(row[4])
                    time = float(row[1])
                    s = ''

        # commenting out for now
        # print cmd_rows

#getKeywords()

# may have to account for time zone difference, maybe not
def getKPM():
    wpm = [0] * (24*60)

    with open('keys.csv', 'rb') as csvfile:
        reader = csv.reader(csvfile, delimiter=',')
        next(reader)  # skip header row
        for row in reader:
            if float(row[1]) >= yesterday_timestamp and float(row[1]) <= today_timestamp:
                index = int((float(row[1]) - yesterday_timestamp) / 60)
                wpm[index] += 1
            else:
                continue
    print wpm

# getKPM()

def getWPM():
    wpm = [0] * (24*60)
    time_word_start = yesterday_timestamp
    window = 0
    new_word = ['Enter','Left','Right','Up','Down','Tab', 'Escape',' ']
    last_was_char = False

    with open('keys.csv', 'rb') as csvfile:
        reader = csv.reader(csvfile, delimiter=',')
        next(reader)  # skip header row
        for row in reader:
            if float(row[1]) >= yesterday_timestamp and float(row[1]) <= today_timestamp:
                text = str(row[2])
                if text in new_word or int(row[5]) != window or 'Cmd' in row[3]:
                    if last_was_char:
                        index = int((float(time_word_start) - yesterday_timestamp) / 60)
                        print index
                        wpm[index] += 1
                        window = int(row[5])
                        time_word_start = float(row[1])
                last_was_char =  not (text in new_word or 'Cmd' in row[3])
            else:
                continue
    print wpm

getWPM()
