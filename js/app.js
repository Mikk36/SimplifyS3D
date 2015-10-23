/**
 * Created by Mikk on 20.10.2015.
 */

/**
 * @param file
 * @constructor
 */
function Simplifier(file) {
  this.file = file;
  this.lineCount = 0;
  this.duplicateCount = 0;
  this.relativeMotion = false;
  this.previousLine = "";
  this.output = "";

  this.navigator = new FileNavigator(this.file);
  this.navigator.readSomeLines(0, this.parseLines.bind(this));
}

/**
 * @param {string} previousLine
 * @param {string} line
 * @returns {boolean}
 */
Simplifier.prototype.isRedundant = function(previousLine, line) {
  if (previousLine.substr(0, 2) !== "G1" || line.substr(0, 2) !== "G1") {
    return false;
  }

  var previousE = this.getParameter(previousLine, "e");
  if (previousE === false) {
    return false;
  }
  var currentE = this.getParameter(line, "e");
  if (currentE === false) {
    return false;
  }

  if (Math.abs(previousE - currentE) < eResolution) {
    var distance = this.xyDistance(previousLine, line);
    if (distance === false) {
      return false;
    }
    return distance < xyResolution;
  }

  return false;
};

/**
 * @param {string} previousLine
 * @param {string} line
 * @returns {boolean|number}
 */
Simplifier.prototype.xyDistance = function(previousLine, line) {
  var xPrevious = this.getParameter(previousLine, "x");
  if (xPrevious === false) {
    return false;
  }
  var yPrevious = this.getParameter(previousLine, "y");
  if (yPrevious === false) {
    return false;
  }
  var xCurrent = this.getParameter(line, "x");
  if (xCurrent === false) {
    return false;
  }
  var yCurrent = this.getParameter(line, "y");
  if (yCurrent === false) {
    return false;
  }

  var dX = xCurrent - xPrevious;
  var dY = yCurrent - yPrevious;
  return Math.sqrt(dX * dX + dY * dY);
};

/**
 * @param {string} line
 * @param {string} parameter
 * @returns {boolean|number} False if not found, number otherwise
 */
Simplifier.prototype.getParameter =  function(line, parameter) {
  var regex = new RegExp(parameter.toUpperCase() + "([-.0-9]*)");
  var match = line.match(regex);

  if (match === null) {
    return false;
  }
  return parseFloat(match[1]);
};

/**
 * Process some lines
 * @param err
 * @param index
 * @param {string[]} lines
 * @param eof
 */
//function parseLine(line, next) {
Simplifier.prototype.parseLines = function(err, index, lines, eof) {
  if(err) {
    console.log(err);
    return;
  }

  for(var i = 0; i < lines.length; i++) {
    var line = lines[i];

    this.lineCount++;
    if (line.substr(0, 3) === "G91") {
      this.relativeMotion = true;
    } else if (line.substr(0, 3) === "G90") {
      this.relativeMotion = false;
    }

    if (!this.relativeMotion && line.substr(0, 2) === "G1" && this.isRedundant(this.previousLine, line)) {
      this.duplicateCount++;
      continue;
    }

    this.previousLine = line;
    this.output += line + "\n";
  }

  if(eof) {
    this.returnFile();
    return;
  }

  this.navigator.readSomeLines(index + lines.length, this.parseLines.bind(this));
};

/**
 * Send the file to client
 */
Simplifier.prototype.returnFile = function() {
  var stats = $("#stats");
  stats.append(this.file.name + "<br>");
  stats.append("<span style='font-size: 0.75em'>Total lines: " + this.lineCount + "<br>" +
    "Duplicate lines: " + this.duplicateCount + "<br></span>");
  var blob = new Blob([this.output], {
    type: "text/plain;charset=utf-8"
  });
  saveAs(blob, this.file.name.substring(0, this.file.name.lastIndexOf(".")) + "_filtered.gcode");
  resetProgress();
};

/**
 * Reset counters and data after sending data to client
 */
function resetProgress() {
  if(fileCount > 0) {
    fileCount--;
  }
  if(fileCount == 0) {
    $("#file").parent().removeClass("disabled");
    delete simplifiers[this.file.name];
  }
}

function init() {
  console.log("Starting app");
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    // Great success! All the File APIs are supported.
  } else {
    console.log('The File APIs are not fully supported in this browser.');
  }
  $("#file").change(fileHandler);
  $("#s3d").on("submit", function (event) {
    event.preventDefault();
  });
  $("#xyResolution").change(function () {
    xyResolution = parseFloat(this.value);
    console.log("New xyResolution: " + xyResolution);
  });
  $("#eResolution").change(function () {
    eResolution = parseFloat(this.value);
    console.log("New eResolution: " + eResolution);
  });
}

function fileHandler() {
  fileCount = this.files.length;
  var input = $("#file");
  input.parent().addClass("disabled");
  jQuery.each(this.files, function (index, file) {
    simplifiers[file.name] = new Simplifier(file);
  });
  input.val(null);
}

var simplifiers = {};
var fileCount = 0;
var xyResolution = 0.01;
var eResolution = 0.0005;

$(document).ready(init);
