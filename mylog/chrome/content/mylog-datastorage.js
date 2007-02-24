// *** bearly, vviswana: 02-13-2007: Modified addEntry to return id.  Added savePage function.
// *** groupmeeting: 02-12-2007: refactored to use refactored Comment object
// *** ebowden2, jamatz: 02-23-2007: Changed the findEntries function so it now searchs on a case-insensitive basis.  Firefox does not support the XPath 2.0 lower-case() function, so this is done using translate() instead, with associated possible bugs when non-English-alphabet characters are encountered.  Should work for most cases, though.

/* INTERFACES */

//function DataStore() {
//	this.open = open;
//	this.close = close;
//
//	// Public methods
//	function open() { return handler }
//	function close(handler) {}
//}
//
//function DataHandler() {
//	this.addEntry = addEntry;
//	this.replaceEntry = replaceEntry;
//	this.removeEntry = removeEntry;
//	this.getEntry = getEntry;
//
//	function addEntry(logEntry) {}
//	function replaceEntry(logEntry) {}
//	function removeEntry(logEntry) {}
//	function getEntry(id) { return logEntry }
//}

// Revision History
// Authors                                              Date            Comment
// Vinayak Viswanathan - observer, Thomas Park - coder  12/7/2006       Adding functionality to search through comments
// Vinayak Viswanathan - coder, Thomas Park - observer  12/7/2006       Added _readXmlFileNew()
//                                                                      Uses XmlHttpRequest() (in our opinion it is simpler)
// Brian Cho and Soumi Sinha							12/1/2006		Initial creation


/* IMPLEMENTATIONS */
// Created by Brian Cho and Soumi Sinha on December 1, 2006.
function XmlDataStore() {
	this.open = open;
	this.close = close;

	this.setXmlFilepath = setXmlFilepath;
	
	// Private members
	var _xmlFilepath = "mylog_data.xml";

	// Public methods
	function open() {
        var doc = _readXmlFile();      
		var handler = new XmlDataHandler();
		handler.setDomDoc(doc);
		return handler;
	}

	function close(handler) {
		var doc = handler.getDomDoc();
		_saveXmlFile(doc);
	}

	// Created by Vinayak Viswanathan and Thomas Park on December 7.
    function _readXmlFileNew() {
        //_xmlFilepath = "chrome://mylog/content/mylog_data.xml";
        var req = new XMLHttpRequest();
        
        // We're appending the chrome uri to avoid breaking anything that needs
        // the filepath to be hardcoded...this is a bad thing
        req.open("GET", "chrome://mylog/content/" + _xmlFilepath, false); 
        req.send(null);
        // print the name of the root element or error message
        var doc = req.responseXML;
        return doc;
    }

	// Created by Brian Cho and Jesus DeLaTorre on December 8.
	//   Should be used for testing purposes only.
	//
	// filename is a file in the user's firefox profile directory
	function setXmlFilepath(filename) {
		_xmlFilepath = filename;
	}

	// Private methods
	function _readXmlFile() {
		var doc;
		var file = Components.classes["@mozilla.org/file/directory_service;1"]
							 .getService(Components.interfaces.nsIProperties)
							 .get("ProfD", Components.interfaces.nsIFile);
		file.append(_xmlFilepath);
		// alert(file.path);
		if (!file.exists()) {
			// alert("File doesn't exist");
			doc = document.implementation.createDocument("", "", null);
			var rootElem = doc.createElement("mylog");
			var entriesElem = doc.createElement("entries");
			var tagsElem = doc.createElement("tags");
			entriesElem.setAttribute("counter", "0");
			doc.appendChild(rootElem);
			rootElem.appendChild(entriesElem);
			rootElem.appendChild(tagsElem);
		} else {
			// alert("File exists");

			// Read file to string (data)
			var data = "";
			var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
									.createInstance(Components.interfaces.nsIFileInputStream);
			var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"]
									.createInstance(Components.interfaces.nsIScriptableInputStream);
			fstream.init(file, -1, 0, 0);
			sstream.init(fstream); 

			var str = sstream.read(4096);
			while (str.length > 0) {
			  data += str;
			  str = sstream.read(4096);
			}

			sstream.close();
			fstream.close();

			// Parse string (data) to DOM object
			var domParser = new DOMParser();
			doc = domParser.parseFromString(data, "text/xml");
		}
		// print the name of the root element or error message
		// alert(doc.documentElement.nodeName == "parsererror" ? "error while parsing" : doc.documentElement.nodeName);

		return doc;
	}

	function _saveXmlFile(doc) {

		// Also save the tags.xml

		var file = Components.classes["@mozilla.org/file/directory_service;1"]
							 .getService(Components.interfaces.nsIProperties)
							 .get("ProfD", Components.interfaces.nsIFile);
		file.append(_xmlFilepath);

		var serializer = new XMLSerializer();
		// The actual string that is written to file
		var data = serializer.serializeToString(doc);
		
		// file is nsIFile, data is a string
		var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
								 .createInstance(Components.interfaces.nsIFileOutputStream);

		// use 0x02 | 0x10 to open file for appending.
		foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0); // write, create, truncate
		foStream.write(data, data.length);
		//serializer.serializeToStream(doc, foStream, "");
		foStream.close();
	}
}

// Created by Brian Cho and Soumi Sinha on December 1, 2006.
function XmlDataHandler() {
	var _doc;

	this.getAllTags = getAllTags;
	this.addTag = addTag;
	this.addEntry = addEntry;
	this.replaceEntry = replaceEntry;
	this.removeEntry = removeEntry;
	this.getEntry = getEntry;
	this.findEntries = findEntries;
	this.getAllEntries = getAllEntries;

	this.getDomDoc = getDomDoc;
	this.setDomDoc = setDomDoc;

    //Created December 6th by Josh Matz and Eric Bluhm
	//getAllTags returns an array holding all the tags currently in _doc
	function getAllTags() {

		var existingTags = new Array();  //Array of strings
		for (var i = 0; i<_doc.getElementsByTagName("tag").length; i++) {			
			existingTags.push(_doc.getElementsByTagName("tag")[i].getAttribute("name"));
		}

		return existingTags;
	}

	//Created December 6th by Josh Matz and Eric Bluhm
	//addTag recieves a tag and writes it into _doc
	//returns true if the tag has been added, otherwise false
	function addTag(tag) {

		if (tag == "") {
			return false;
		}
	
		var existingTags = new Array();  //Array of strings
		existingTags = getAllTags();

		for (var i = 0; i<existingTags.length; i++) {
			if(tag == existingTags[i]) {
				return false;
			}
		}
				
		var tagElem = _doc.createElement("tag");
		tagElem.setAttribute("name", tag);
		_doc.getElementsByTagName("tags")[0].appendChild(tagElem);
		return true;
	}
	
	function addEntry(logEntry, doc) {

		var idstr = _doc.getElementsByTagName("entries")[0].getAttribute("counter");
		var id = idstr * 1;
		logEntry.setId(id);
		var counter = id + 1;
		_doc.getElementsByTagName("entries")[0].setAttribute("counter", counter.toString());

		var file = savePage(doc, id);
		logEntry.setFilePath(file.path);

		var entryElem = _createDomNode(logEntry);

		_doc.getElementsByTagName("entries")[0].appendChild(entryElem); // entriesElem.appendChild(entryElem);
	
		return id;
	}

	// Created by Brian Cho and Jesus DeLaTorre on December 4.
	function replaceEntry(logEntry) {
		var oldNode;
		var newNode = _createDomNode(logEntry);

		var entriesNode = _doc.getElementsByTagName("entries")[0];

		var idstr = logEntry.getId();
		var xpathStr = "/mylog/entries/entry[@id = "+ idstr +"]";
		var xpathRetriever = new XpathRetriever(_doc, xpathStr);
		var oldNode = xpathRetriever.getNext();
		
		if (oldNode) {
			entriesNode.replaceChild(newNode, oldNode);
		} else {
			dump("replaceEntry: No previous node");
		}
	}

	function removeEntry(id) {
		var entriesNode = _doc.getElementsByTagName("entries")[0];

		var xpathStr = "/mylog/entries/entry[@id = "+ id +"]";
		var xpathRetriever = new XpathRetriever(_doc, xpathStr);

		var oldNode = xpathRetriever.getNext();
		if (oldNode) {
			entriesNode.removeChild(oldNode);
		} else {
			dump("removeEntry: No previous node");
		}
	}

	// argument id is an int (not a string!)
	function getEntry(id) {
		var idstr = id.toString();
		var xpathStr = "/mylog/entries/entry[@id = "+ idstr +"]";
		var xpathRetriever = new XpathRetriever(_doc, xpathStr);
		var thisNode = xpathRetriever.getNext();
		if (thisNode) {
			var logEntry = new LogEntry();
			logEntry.setFromDomNode(thisNode);
			return logEntry;
		}
	}

	// Modified by Vinayak Viswanathan and Thomas Park on December 7.
    function findEntries(keyword,searchType) {
        var doSearch = true;
		var xpathStr = "";

		if(searchType == "tag") {
			xpathStr = "/mylog/entries/entry[entrytags/entrytag/@name = '"+keyword+"']";
        } else if(searchType == "comment"){
			xpathStr = "/mylog/entries/entry[count(comments/comment[contains(.,'" + keyword + "')]) > 0]";
        } else {
			xpathStr = "/mylog/entries/entry[contains(translate("+searchType+", 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), translate('"+keyword+"', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'))]";
        }
        
		var entryResults = new Array();
		if(doSearch == true) {
			var xpathRetriever = new XpathRetriever(_doc, xpathStr);
			var thisNode = xpathRetriever.getNext();
			while (thisNode) {
				var logEntry = new LogEntry();
				logEntry.setFromDomNode(thisNode);
				entryResults.push(logEntry);
				thisNode = xpathRetriever.getNext();
			}
		}
		return entryResults;
	}

	// Created by Brian Cho and Soumi Sinha on December 9, 2006.
	function getAllEntries() {
        var doSearch = true;
        
		var xpathStr = "/mylog/entries/entry";
		var xpathRetriever = new XpathRetriever(_doc, xpathStr);

		var thisNode = xpathRetriever.getNext();
		var entryResults = new Array();
		while (thisNode) {
			var logEntry = new LogEntry();
			logEntry.setFromDomNode(thisNode);
			entryResults.push(logEntry);
			thisNode = xpathRetriever.getNext();
		}
		return entryResults;

	}

	// Modified by Brian Cho and Jesus DeLaTorre on December 4.
	function _createDomNode(logEntry) {
		var id = logEntry.getId();
		var url = logEntry.getUrl();
		var title = logEntry.getTitle();
		var filepath = logEntry.getFilePath(); // TODO: actually get a filepath (once we save an actual file)
		var tags = logEntry.getTags();
		var comments = logEntry.getComments();

		var entryElem = _doc.createElement("entry");
		var entryTagsElem = _doc.createElement("entrytags");
		var titleElem = _doc.createElement("title");
		var urlElem = _doc.createElement("url");
		var filepathElem = _doc.createElement("filepath");
		var commentsElem = _doc.createElement("comments");
		entryElem.setAttribute("id", id.toString());

		var titleElemText = _doc.createTextNode(title);
		var urlElemText = _doc.createTextNode(url);
		var filepathElemText = _doc.createTextNode(filepath);


		titleElem.appendChild(titleElemText);
		entryElem.appendChild(titleElem);
		urlElem.appendChild(urlElemText);
		entryElem.appendChild(urlElem);
		filepathElem.appendChild(filepathElemText);
		entryElem.appendChild(filepathElem);

		// Add all tags
		for (var i = 0; i < tags.length; i++) {
			var thisEntryTagElem = _doc.createElement("entrytag");
			thisEntryTagElem.setAttribute("name", tags[i]);
			entryTagsElem.appendChild(thisEntryTagElem);
		}
		entryElem.appendChild(entryTagsElem);

		// Add all comments
		for (var i = 0; i < comments.length; i++) {
			var thisCommentElem = _doc.createElement("comment");
			thisCommentElem.setAttribute("time", comments[i].getTimeString()); // TODO: shouldn't save this
			thisCommentElem.setAttribute("date", comments[i].getDateParsableString());
			thisCommentElem.appendChild(_doc.createTextNode(comments[i].getContent()));
			commentsElem.appendChild(thisCommentElem);
		}
		entryElem.appendChild(commentsElem);

		return entryElem;
	}

	function getDomDoc() {
		return _doc;
	}

	function setDomDoc(doc) {
		_doc = doc;
	}

}

function XpathRetriever(dom, xpathString) {
	var _nsResolver = document.createNSResolver( dom.ownerDocument == null ?  dom.documentElement : dom.ownerDocument.documentElement );
	var _resultsIter = document.evaluate(xpathString, 
		dom, 
		_nsResolver,
		XPathResult.ORDERED_NODE_ITERATOR_TYPE, 
	null );

	this.getNext = getNext;
	
	function getNext() {
		try {
			var thisNode = _resultsIter.iterateNext();
			return thisNode;
		} catch (e) {
			dump( 'XpathRetriever Exception: ' + e );
		}
	}
}

function savePageBlah(url, id) {
	try {
		 var data = "";
		 var req = new XMLHttpRequest();
		 req.open('GET', url, false); 
		 req.send(null);
		 if(req.status == 200)
		   data = req.responseText;
  
		  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
          file.append("mylog");
          file.append(id + ".html");
          
          // file is nsIFile, data is a string
		  var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
		                         .createInstance(Components.interfaces.nsIFileOutputStream);
		
		  // use 0x02 | 0x10 to open file for appending.
		  foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0); // write, create
		  foStream.write(data, data.length);
		  foStream.close();
		  return file;
          
	} catch (e) {
		dump('savePage Exception ' + e);
	}
	return "";
}

function savePage(doc, id)
{
	try
	{
		var file = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProfD", Components.interfaces.nsIFile);
        file.append("extensions");
        file.append("mylog");
        file.append(id + ".html");
        
        var dir = Components.classes["@mozilla.org/file/directory_service;1"]
             .getService(Components.interfaces.nsIProperties)
             .get("ProfD", Components.interfaces.nsIFile);
        dir.append("extensions");
        dir.append("mylog");
        dir.append(id);
        
		var saver =  Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
			.createInstance(Components.interfaces.nsIWebBrowserPersist); 
		saver.saveDocument(doc, file, dir, null, null, null);
		return file;
	} catch (e) {
		//alert('savePage Exception ' + e)
		return "";
	}
}