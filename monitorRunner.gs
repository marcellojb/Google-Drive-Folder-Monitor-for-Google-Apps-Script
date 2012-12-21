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

// Global array to store the list of monitored folders
var monitoredFolders = new Array();

function monitorRunner() {
  // Get the list of folders to monitor
  var monitoredFolders = getMonitoredFolders();
   for(var i = 0; i < monitoredFolders.length; i++) {
     if(monitoredFolders[i].substring(0,5) == "mon__") {
       // run the check on the folder
       var folderName = monitoredFolders[i].substring(5);
       buildMonitoredFolders(folderName);
     }
   }
  // scan monitored folders
  scanMonitoredFolders();
}

/**
 * Build the global array of monitored folders
 *
 * @param {String} mainFolder the main folder to monitor
 */
function buildMonitoredFolders(mainFolder) {
  var folderChilds = new Array();
  var folder = DocsList.getFolder(mainFolder);
  monitoredFolders.push(mainFolder);
  getSubfolders(folder, true, mainFolder);
  for(var i = 0; i < monitoredFolders.length; i++) {
    Logger.log(monitoredFolders[i]); 
  }
}

/**
 * Get subfolders of the specified folder
 */
function getSubfolders(folder, output, parent) {
  var nodes;
  if(folder.getFolders().length > 0) {
    nodes = folder.getFolders();
    loopNodeChildren(nodes, output, parent);
  }
}

/**
 * Get all the childrens of the specified parent 
 */
function loopNodeChildren(nodes, output, parent) {
  var nodes;
  for(var i=0;i<nodes.length;i++){
    node = nodes[i];
    if(output) {
            saveFolder(node, parent);
    }
    if(node.getFolders().length > 0) {
      getSubfolders(node, output, parent + "/" + node.getName());
    }
  }  
}

/**
 * Save the current folder to the global monitoredFolders array
 * including the full path
 */
function saveFolder(node, parent) {
  monitoredFolders.push(parent + "/" +node.getName());
}

/**
 * Scan monitored folders to detect changes
 */
function scanMonitoredFolders() {
  for(var i = 0; i < monitoredFolders.length; i++) {
    folderMonitor(monitoredFolders[i]); 
  }
}

/**
 * Monitor changes made to the specified folder
 */
function folderMonitor(monitoredFolder){
  try {
    
    // Array to hold new files
    var newFiles = new Array();
    var newFilesIndex = 0;
    
    var folder = DocsList.getFolder(monitoredFolder);
    filesInFolder = folder.getFiles();
    foldersInFolder = folder.getFolders();
    for(var i = 0; i < filesInFolder.length; i++) {
       var fileName = filesInFolder[i].getName();
       // Check if the file has already been indexed
      if(!existsInDb(monitoredFolder, filesInFolder[i])) {
        // Add new files to newFiles array
        newFiles[newFilesIndex] = {
          folder: monitoredFolder,
          file: filesInFolder[i]
        };
        newFilesIndex++;
      }
    }
    
    // Notify the user about new files
    if(newFiles.length > 0) {
      notifyUser(newFiles);
    }
    
    // Check deleted files
   var deletedFiles =  checkDeleted(monitoredFolder, filesInFolder);
   if(deletedFiles.length > 0) {
      notifyDeletedUser(deletedFiles);
   }
  } catch (e) {
    MailApp.sendEmail(Session.getUser().getEmail(), "Error report", e.message);
  }
}


/**
 * Check if a file already exists inside the database
 */
function existsInDb(folder, file) {
  var db = ScriptDb.getMyDb();
  var results = db.query({type: "file", directory: folder, name: file.getName()});
 
  if(results.getSize() > 0) {
    return true;
  } else {
     addToDb(folder, file);
     return false;
  }
}

/**
 * Add a file to the index database
 */
function addToDb(folder, file) {
  var db = ScriptDb.getMyDb();
  var ob = {type: "file",
            directory: folder,
            name: file.getName()
            };
  var stored = db.save(ob);
}


/**
 * Check for deleted files
 */
function checkDeleted(folder, filesInFolder) {
  var db = ScriptDb.getMyDb();
  var deletedFiles = new Array();
  var deletedFilesIndex = 0;
  var results = db.query({type: "file", directory: folder});
  while (results.hasNext()) {
    var found = 0;
    var result = results.next();
    // Check if the file exists inside Google Drive folder
    for(var i = 0; i < filesInFolder.length; i++) {
      if(result.name == filesInFolder[i].getName()) {
        found = 1;
      }
    }
    
    // no matching found
    if(found == 0) {
      deletedFiles[deletedFilesIndex] = {
          folder: folder,
          file: result.name
        };
        deletedFilesIndex++;
        // Remove the file from the database
        removeDeletedFileFromDb(result);
    } else {
      found = 0;
    }
  }
  return deletedFiles;
}

/**
 * Remove a deleted file from the database
 */
function removeDeletedFileFromDb(fileObject) {
  var db = ScriptDb.getMyDb();
  db.remove(fileObject);
}


/**
 * Notify user about new files
*/
function notifyUser(fileArray) {
  var body = "";
  var email = Session.getUser().getEmail();
  var domain = email.replace(/.*@/, "");
  for(var i=0; i<fileArray.length; i++) {
    // Build the folder view url
    var folder = DocsList.getFolder(fileArray[i]["folder"]);
    var folderViewUrl = "https://docs.google.com/a/" + domain + "/folder/d/" + folder.getId() +"/edit";
    body = body + "Folder: " + "<a href='" + folderViewUrl + "'>" + fileArray[i]["folder"] + "</a><br>";
    
    // Build the file view url
    var fileType = fileArray[i]["file"].getFileType().toString();
    var fileId = fileArray[i]["file"].getId();
    var fileViewUrl = "";
    switch(fileType) {
      case "document":
        fileViewUrl = "https://docs.google.com/a/" + domain + "/document/d/"+ fileId +"/edit";
        break;
      case "spreadsheet":
        fileViewUrl = "https://docs.google.com/a/" + domain + "/spreadsheet/ccc?key="+ fileId +"#gid=0"; 
        break;        
      case "presentation":
        fileViewUrl = "https://docs.google.com/a/" + domain + "/presentation/d/"+ fileId +"/edit";
        break;
      case "drawing":
        fileViewUrl = "https://docs.google.com/a/" + domain + "/drawings/d/"+ fileId +"/edit";
        break;
      default:
        fileViewUrl = "#";
        break;
    }
    body = body + "File: " + "<a href='" + fileViewUrl + "'>" + fileArray[i]["file"].getName() + "</a><br>";
  }
  
  MailApp.sendEmail(
                     Session.getUser().getEmail(), 
                     "Google Drive: New files in monitored folders", 
                     "",
                     { htmlBody: body }
                   );
}


/**
 * Notify user about deleted files
*/
function notifyDeletedUser(fileArray) {
  var body = "";
  var email = Session.getUser().getEmail();
  var domain = email.replace(/.*@/, "");  
  for(var i=0; i<fileArray.length; i++) {
    // Build the folder view url
    var folder = DocsList.getFolder(fileArray[i]["folder"]);
    var folderViewUrl = "https://docs.google.com/a/" + domain + "/folder/d/" + folder.getId() +"/edit";
    body = body + "Folder: " + "<a href='" + folderViewUrl + "'>" + fileArray[i]["folder"] + "</a><br>";
    body = body + "File: " + fileArray[i]["file"];
  }
  
  MailApp.sendEmail(
                     Session.getUser().getEmail(), 
                     "Google Drive: Deleted files in monitored folders", 
                     "",
                     { htmlBody: body }
                   );
}

function showAll() {
  var db = ScriptDb.getMyDb();
  var results = db.query({});

  while (results.hasNext()) {
    var result = results.next();
    Logger.log(Utilities.jsonStringify(result));
  }
}

function deleteAll() {
  var db = ScriptDb.getMyDb();
  while (true) {
    var result = db.query({}); // get everything, up to limit
    if (result.getSize() == 0) {
      break;
    }
    while (result.hasNext()) {
      db.remove(result.next());
    }
  }
}
