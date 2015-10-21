/**
 * Created by Mikk on 20.10.2015.
 */
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
  jQuery.each(this.files, function (index, file) {
    console.log(file.name + " loaded");
    currentFile = file.name;
    var reader = new LineReader();
    reader.on("line", parseLine);
    reader.on("end", returnFile);
    reader.read(file);
  });
  $("#file").val(null);
}

/**
 * @param {string} previousLine
 * @param {string} line
 * @returns {boolean}
 */
function isRedundant(previousLine, line) {
  if (previousLine.substr(0, 2) !== "G1" || line.substr(0, 2) !== "G1") {
    return false;
  }

  var previousE = getParameter(previousLine, "e");
  if (previousE === false) {
    return false;
  }
  var currentE = getParameter(line, "e");
  if (currentE === false) {
    return false;
  }

  if (Math.abs(previousE - currentE) < eResolution) {
    var distance = xyDistance(previousLine, line);
    if (distance === false) {
      return false;
    }
    return distance < xyResolution;
  }

  return false;
}

/**
 * @param {string} previousLine
 * @param {string} line
 * @returns {boolean|number}
 */
function xyDistance(previousLine, line) {
  var xPrevious = getParameter(previousLine, "x");
  if (xPrevious === false) {
    return false;
  }
  var yPrevious = getParameter(previousLine, "y");
  if (yPrevious === false) {
    return false;
  }
  var xCurrent = getParameter(line, "x");
  if (xCurrent === false) {
    return false;
  }
  var yCurrent = getParameter(line, "y");
  if (yCurrent === false) {
    return false;
  }

  var dX = xCurrent - xPrevious;
  var dY = yCurrent - yPrevious;
  return Math.sqrt(dX * dX + dY * dY);
}

/**
 * @param {string} line
 * @param {string} parameter
 * @returns {boolean|number} False if not found, number otherwise
 */
function getParameter(line, parameter) {
  var regex = new RegExp(parameter.toUpperCase() + "([-.0-9]*)");
  var match = line.match(regex);

  if (match === null) {
    return false;
  }
  return parseFloat(match[1]);
}

/**
 * Process a single line
 * @param {string} line
 * @param next Callback
 */
function parseLine(line, next) {
  lineCount++;
  if (line.substr(0, 3) === "G91") {
    relativeMotion = true;
  } else if (line.substr(0, 3) === "G90") {
    relativeMotion = false;
  }

  if (!relativeMotion && line.substr(0, 2) === "G1" && isRedundant(previousLine, line)) {
    duplicateCount++;
    //console.log(lineCount + ": " + line);
    next();
    return;
  }

  previousLine = line;
  output += line + "\n";
  next();
}

/**
 * Send the file to client
 */
function returnFile() {
  console.log("Total lines: " + lineCount);
  console.log("Duplicate lines: " + duplicateCount);
  var blob = new Blob([output], {
    type: "text/plain;charset=utf-8"
  });
  saveAs(blob, currentFile.substring(0, currentFile.lastIndexOf(".")) + "_filtered.gcode");
  resetProgress();
}

/**
 * Reset counters and data after sending data to client
 */
function resetProgress() {
  lineCount = 0;
  duplicateCount = 0;
  output = "";
  previousLine = "";
}

var currentFile = "";
var lineCount = 0;
var duplicateCount = 0;
var relativeMotion = false;
var previousLine = "";
var output = "";
var xyResolution = 0.01;
var eResolution = 0.0005;

$(document).ready(init);
