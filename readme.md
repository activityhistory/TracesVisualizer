![Dayview](https://raw.githubusercontent.com/activityhistory/TracesVisualizer/master/images/dayview_v4.png)

This repository holds test code for visualizing Traces data using Javascript. To date, the most development effort has gone into developing a 'Dayview' to inspect the recorded data by day.

To run the Dayview:
 1. navigate to the `dayview` folder and run `python extract.py` to create a JSON file of your Traces data.
 2. Create a symlink to your Traces screenshots by executing `ln -s ~/.traces/screenshots screenshots`. This will let the Dayview access your images without needing to copy all of them.
 3. Run `npm install` from within the dayview/ folder to install dependencies (there should be a node-modules folder that shows up after this command is run). This only has to be done once.
 4. Run `node app.js` to start running a local Node.JS webserver.
 5. Navigate to http://localhost:8888 and enjoy!

This project is still in a rough state. Next steps include:

* test that sqlite to JSON extraction pulls in all apps and all experiences
* data validation
* refinement of interface 
