This repository currently holds test code for visualizing Traces data using Javascript. To visualize your own data, run the extraction script to generate a JSON file of your Traces data.

'''
python extract.py
'''

Then run set up a basic HTTP server to handle reading the JSON data.

'''
-m SimpleHTTPServer
'''

Finally, you can navigate to http://localhost:8000/dayview.html to see the Dayview representation of your data.

This project is still in a rough state. Next steps include:
* add word tracking
* show underlying timeline data on rollover
* allow zooming on timeline
* test that sqlite to JSON extraction pulls in all apps and all experiences

We also have a number of known issues:
 1. exports to file with extra layer of []
