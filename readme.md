![Dayview](https://raw.githubusercontent.com/activityhistory/TracesVisualizer/master/images/dayview_v2.png)

This repository holds test code for visualizing Traces data using Javascript. To date, the most development effort has gone into developing a 'Dayview' to inspect the recorded data by day.

To run the Dayview:
1. navigate to the `dayview` folder and run `python extract.py` to create a JSON file of your Traces data.
2. Create a symlink to your Traces screenshots by executing `ln -s ~/.traces/screenshots screenshots`. This will let the Dayview access your images without needing to copy all of them.
3. Run `python -m SimpleHTTPServer` to set up a basic HTTP server to handle reading the JSON data.
4. Navigate to http://localhost:8000/dayview.html

This project is still in a rough state. Next steps include:
* visualizing words types
* show underlying timeline data on rollover
* allow zooming on timeline
* test that sqlite to JSON extraction pulls in all apps and all experiences

We also have a number of known issues:
 1. exports to file with extra layer of []
