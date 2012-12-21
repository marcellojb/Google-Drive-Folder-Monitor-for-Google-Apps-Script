/*
  --- Context.IO API Connector ---
 
   Copyright (c) 2012 Marcello Scacchetti - Jelly Bend

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

function onOpen() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // These are the 2 menu entries
  var menuEntries = [ 
                       {name: "Configuration", functionName: "configInterface"},
                       {name: "Run folder monitor", functionName: "monitorRunner"}
                    ];

  // After defining the menu entries, then you define the menu itself
  ss.addMenu("Drive Folder Monitor", menuEntries);
}

function configInterface() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var app = UiApp.createApplication().setTitle('Drive Folder Monitor Configuration').setHeight(400).setWidth(800);
  var addButton = app.createButton('Add ->').setWidth(120).setId("addButtonId");
  var removeButton = app.createButton('<- Remove').setWidth(120).setId("removeButtonId");
  var addAllButton = app.createButton('Add all ->>').setWidth(120).setId("addAllButtonId");
  var removeAllButton = app.createButton('<<- Remove all').setWidth(120).setId("removeAllButtonId");
  var buttonsVerticalPanel = app.createVerticalPanel();
  var mypanel = app.createVerticalPanel();
  var myhpanel = app.createHorizontalPanel();
  var triggerPanel = app.createHorizontalPanel();
  var foldersList = app.createListBox(true).setId('foldersListId').setName('foldersList').setTitle('Drive Folders');
  var selectedFoldersList = app.createListBox(true).setId('selectedFoldersListId').setName('selectedFoldersList').setTitle('Monitored Drive Folders');
  
  // setup buttons click handlers
  addButton.addClickHandler(app.createServerHandler("addButtonClicked").addCallbackElement(myhpanel));
  removeButton.addClickHandler(app.createServerHandler("removeButtonClicked").addCallbackElement(myhpanel));
  addAllButton.addClickHandler(app.createServerHandler("addAllButtonClicked").addCallbackElement(myhpanel));
  removeAllButton.addClickHandler(app.createServerHandler("removeAllButtonClicked").addCallbackElement(myhpanel));
  
  // foldersList
  foldersList.setHeight(380);
  foldersList.setWidth(300);
  
  // selectedFoldersList
  selectedFoldersList.setHeight(380);
  selectedFoldersList.setWidth(300);
  
  // add buttons
  buttonsVerticalPanel.add(addButton);
  buttonsVerticalPanel.add(removeButton);
  buttonsVerticalPanel.add(addAllButton);
  buttonsVerticalPanel.add(removeAllButton);
  
  
  // trigger panel
  var triggerLabel = app.createLabel("Run drive folder monitor each:");
  var triggerDropbox = app.createListBox(false).setId('triggerDropboxId').setName('triggerDropbox');
  triggerDropbox.addItem("1");
  triggerDropbox.addItem("5");
  triggerDropbox.addItem("10");
  triggerDropbox.addItem("15");
  triggerDropbox.addItem("30");
  var triggerLabelTime = app.createLabel("minute/s");
  
  // setup change handler for the dropbox
  var triggerDropboxChangeHandler = app.createServerClickHandler('triggerDropboxChange').addCallbackElement(triggerDropbox);
  triggerDropbox.addChangeHandler(triggerDropboxChangeHandler);
  
  triggerPanel.add(triggerLabel);
  triggerPanel.add(triggerDropbox);
  triggerPanel.add(triggerLabelTime);
  
  
  
  // setup actions
  updateMonitoredFoldersListbox(selectedFoldersList);
  updateFoldersListbox(foldersList);
  
  // Check that the trigger is set, if not set it with default
  if(getCurrentTrigger() == false) {
    UserProperties.setProperty('triggertime', '5');
    createTrigger('5');
    triggerDropbox.setSelectedIndex(1);
  } else {
    // get the current trigger interval
    var currentInterval = UserProperties.getProperty('triggertime');
    
    // set the correct dropdown selected item
    switch(currentInterval) {
      case '1':
        triggerDropbox.setSelectedIndex(0);
        break;
      case '5':
        triggerDropbox.setSelectedIndex(1);
        break;
      case '10':
        triggerDropbox.setSelectedIndex(2);
        break;
      case '15':
        triggerDropbox.setSelectedIndex(3);
        break;
      case '30':
        triggerDropbox.setSelectedIndex(4);
        break;
    }
  }
  
  
  // displace panels
  myhpanel.add(foldersList);
  myhpanel.add(buttonsVerticalPanel);
  myhpanel.add(selectedFoldersList);
  mypanel.add(myhpanel)
  mypanel.add(triggerPanel);
  app.add(mypanel);
  ss.show(app);
}

/**
 * Handle the click of Add button
 * @param {Object} eventInfo event informations
 */
function addButtonClicked(eventInfo) {
   var app = UiApp.getActiveApplication();
   var value = eventInfo.parameter.foldersList;
  var monitoredFoldersListBox = app.getElementById("selectedFoldersListId")
  // If at least an item has been selected
  // TODO: multiple selection
  // multi select box returns a comma separated string
  // var n = value.split(',');
  if(value != "") {
    addMonitoredFolder('mon__' + value);
    updateMonitoredFoldersListbox(monitoredFoldersListBox);
  }
   //app.getElementById("addButtonId").setText(value);
   return app;
 }

/**
 * Handle the click of Remove button
 * @param {Object} eventInfo event informations
 */
function removeButtonClicked(eventInfo) {
   var app = UiApp.getActiveApplication();
   var value = eventInfo.parameter.selectedFoldersList;
   var monitoredFoldersListBox = app.getElementById("selectedFoldersListId")
  // If at least an item has been selected
  // TODO: multiple selection
  // multi select box returns a comma separated string
  // var n = value.split(',');
  if(value != "") {
    removeMonitoredFolder('mon__' + value);
    
    updateMonitoredFoldersListbox(monitoredFoldersListBox);
  }
   //app.getElementById("addButtonId").setText(value);
   return app;
 }

/**
 * Handle the click of Add All button
 * @param {Object} eventInfo event informations
 */
function addAllButtonClicked(eventInfo) {
  var app = UiApp.getActiveApplication();
  var monitoredFoldersListBox = app.getElementById("selectedFoldersListId")
  // TODO: this has to be optimized
  var rootFolder = DocsList.getRootFolder();
  var driveFolders = rootFolder.getFolders();
  for(var i=0; i < driveFolders.length; i++) {
    addMonitoredFolder('mon__' + driveFolders[i].getName());
  }
  updateMonitoredFoldersListbox(monitoredFoldersListBox);
  

   return app;
 }

/**
 * Handle the click of Remove All button
 * @param {Object} eventInfo event informations
 */
function removeAllButtonClicked(eventInfo) {
   var app = UiApp.getActiveApplication();
   var monitoredFoldersListBox = app.getElementById("selectedFoldersListId")
   // delete all monitored folders
   var monitoredFolders = getMonitoredFolders();
   for(var i = 0; i < monitoredFolders.length; i++) {
     if(monitoredFolders[i].substring(0,5) == "mon__") {
       UserProperties.deleteProperty(monitoredFolders[i]);
     }
   }
   
   updateMonitoredFoldersListbox(monitoredFoldersListBox);
   return app;
 }

/**
 * Update content of the monitored folders listbox
 * @param {Listbox} monitoredFoldersListBox listbox of monitored folders
 */
function updateMonitoredFoldersListbox(monitoredFoldersListBox) {
  // Get all monitored folders
  var monitoredFolders = getMonitoredFolders();
  // Clean the listbox
  monitoredFoldersListBox.clear();
  for(var i = 0; i < monitoredFolders.length; i++) {
      // Check if the property is a folder to monitor
    if(monitoredFolders[i].substring(0,5) == "mon__") {
      monitoredFoldersListBox.addItem(monitoredFolders[i].substring(5));
    }
  }
}

/**
 * Update content of the folders listbox
 * @param {Listbox} FoldersListBox listbox of folders
 */
function updateFoldersListbox(FoldersListBox) {
  var rootFolder = DocsList.getRootFolder();
  var driveFolders = rootFolder.getFolders();
  for(var i=0; i < driveFolders.length; i++) {
    var folderName = driveFolders[i].getName();
    FoldersListBox.addItem(folderName);
  }
}


/**
 * Add a folder to the monitored folder list using UserProperties
 * @param {String} folderName name of the folder to monitor
 */
function addMonitoredFolder(folderName) {
  UserProperties.setProperty(folderName, "empty");
}

/**
 * Add a folder to the monitored folder list using UserProperties
 * @param {String} folderName name of the folder to monitor
 */
function removeMonitoredFolder(folderName) {
  UserProperties.deleteProperty(folderName);
}

/**
 * Get the list of monitored folders using UserProperties
 * @return {Array} monitored folders
 */
function getMonitoredFolders() {
  return UserProperties.getKeys();
}

/**
 * Clear all user properties
 */
function deleteAllUserProperties() {
  UserProperties.deleteAllProperties();
}

/**
 * Get the current trigger if exists
 *
 * @return {Trigger} trigger if exists or false
 */
function getCurrentTrigger() {
  var triggers = ScriptApp.getScriptTriggers();
  for(var i=0; i<ScriptApp.getScriptTriggers().length; i++) {
    if(triggers[i].getHandlerFunction() == "monitorRunner") {
      return triggers[i];
    }
  }
  // no trigger set
  return false;
}

/**
 * Create the script trigger
 *
 * @param {Integer} exectime time interval
 */
function createTrigger(exectime) {
  ScriptApp.newTrigger("monitorRunner").timeBased().everyMinutes(exectime).create();
}

/**
 * Handle change of trigger time dropbox
 *
 * @param {Object} eventInfo event informations
 */
function triggerDropboxChange(eventInfo) {
  var app = UiApp.getActiveApplication();
  var triggerTime = eventInfo.parameter.triggerDropbox;
  // Get the current trigger
  var currentTrigger = getCurrentTrigger();
  
  // Delete the current trigger
  ScriptApp.deleteTrigger(currentTrigger);
  
  // update the user property
  UserProperties.setProperty('triggertime', triggerTime);
  
  // Create the new trigger
  createTrigger(triggerTime);
  
  //app.getElementById('debtemp').setText('You chose: ' + eventInfo.parameter.triggerDropbox);
  return app;
}
