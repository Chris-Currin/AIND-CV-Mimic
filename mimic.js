// Mimic Me!
// Fun game where you need to express emojis being displayed

// --- Affectiva setup ---

// The affdex SDK Needs to create video and canvas elements in the DOM
var divRoot = $("#camera")[0];  // div node where we want to add these elements
var width = 640, height = 480;  // camera image size
var faceMode = affdex.FaceDetectorMode.LARGE_FACES;  // face mode parameter

// Initialize an Affectiva CameraDetector object
var detector = new affdex.CameraDetector(divRoot, width, height, faceMode);

// Enable detection of all Expressions, Emotions and Emojis classifiers.
detector.detectAllEmotions();
detector.detectAllExpressions();
detector.detectAllEmojis();
detector.detectAllAppearance();

// --- Utility values and functions ---

// Unicode values for all emojis Affectiva can detect
var emojis = [ 128528, 9786, 128515, 128524, 128527, 128521, 128535, 128539, 128540, 128542, 128545, 128563, 128561 ];
var emoji_names = ['disappointed','flushed','kissing','laughing','rage','relaxed','scream','smiley','smirk','stuckOutTongue','stuckOutTongueWinkingEye','wink'];
// Update target emoji being displayed by supplying a unicode value
function setTargetEmoji(code) {
  $("#target").html("&#" + code + ";");
}

// Convert a special character to its unicode value (can be 1 or 2 units long)
function toUnicode(c) {
  if(c.length == 1)
    return c.charCodeAt(0);
  return ((((c.charCodeAt(0) - 0xD800) * 0x400) + (c.charCodeAt(1) - 0xDC00) + 0x10000));
}

// Update score being displayed
function setScore(correct, total) {
  $("#score").html("Score: " + correct + " / " + total);
}

// Display log messages and tracking results
function log(node_name, msg) {
  $(node_name).append("<span>" + msg + "</span><br />")
}

// --- Callback functions ---

// Start button
function onStart() {
  if (detector && !detector.isRunning) {
    $("#logs").html("");  // clear out previous log
    detector.start();  // start detector
    log('#logs', "Initialising detector...");
    intialiseDetector();
  }
  log('#logs', "Start button pressed");
}

// Stop button
function onStop() {
  log('#logs', "Stop button pressed");
  endGame();
  if (detector && detector.isRunning) {
    detector.removeEventListener();
    detector.stop();  // stop detector
  }
};

// Reset button
function onReset() {
  log('#logs', "Reset button pressed");
  if (detector && detector.isRunning) {
    detector.reset();
  }
  $('#results').html("");  // clear out results
  $("#logs").html("");  // clear out previous log

  // You can restart the game as well
  resetGame();
};

// Add a callback to notify when camera access is allowed
detector.addEventListener("onWebcamConnectSuccess", function() {
  log('#logs', "Webcam access allowed");
});

// Add a callback to notify when camera access is denied
detector.addEventListener("onWebcamConnectFailure", function() {
  log('#logs', "webcam denied");
  console.log("Webcam access denied");
});

// Add a callback to notify when detector is stopped
detector.addEventListener("onStopSuccess", function() {
  log('#logs', "The detector reports stopped");
  $("#results").html("");
});

// Add a callback to notify when the detector is initialized and ready for running
detector.addEventListener("onInitializeSuccess", function() {
  log('#logs', "The detector reports initialized");
  //Display canvas instead of video feed because we want to draw the feature points on it
  $("#face_video_canvas").css("display", "block");
  $("#face_video").css("display", "none");

  // Call a function to initialize the game
  resetGame();
});

// Add a callback to receive the results from processing an image
// NOTE: The faces object contains a list of the faces detected in the image,
//   probabilities for different expressions, emotions and appearance metrics
detector.addEventListener("onImageResultsSuccess", function(faces, image, timestamp) {
  var canvas = $('#face_video_canvas')[0];
  if (!canvas)
    return;

  // Report how many faces were found
  $('#results').html("");
  log('#results', "Timestamp: " + timestamp.toFixed(2));
  log('#results', "Number of faces found: " + faces.length);
  if (faces.length > 0) {
    if (game_state === 'ready'){
        drawReadyTimer(canvas, image);
    }
    // Report desired metrics
    log('#results', "Appearance: " + JSON.stringify(faces[0].appearance));
    log('#results', "Emotions: " + JSON.stringify(faces[0].emotions, function(key, val) {
      return val.toFixed ? Number(val.toFixed(0)) : val;
    }));
    log('#results', "Expressions: " + JSON.stringify(faces[0].expressions, function(key, val) {
      return val.toFixed ? Number(val.toFixed(0)) : val;
    }));
    log('#results', "Emoji: " + faces[0].emojis.dominantEmoji);

    // Call functions to draw feature points and dominant emoji (for the first face only)
    drawFeaturePoints(canvas, image, faces[0]);
    drawEmoji(canvas, image, faces[0]);

    // Call function to run the game
      if (game_state === 'running') {
          timeLeft = timePerRound - (new Date().getTime() - timeStart);
          if (timeLeft<0){
              endGame();
          }else{
            drawGameTimer(canvas,image,timeLeft);
          }
          checkEmojiTarget(faces[0].emojis.dominantEmoji);
      }
  }
});


// --- Custom functions ---

// Draw the detected facial feature points on the image
function drawFeaturePoints(canvas, img, face) {
  //console.log(face);
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');

  // Set the stroke and/or fill style you want for each feature point marker
  // See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D#Fill_and_stroke_styles
  ctx.strokeStyle = '#00eaff';
  ctx.fillStyle = 'black';
  // Loop over each feature point in the face
  for (var id in face.featurePoints) {
      var featurePoint = face.featurePoints[id];

      ctx.beginPath();
      ctx.arc(featurePoint.x,featurePoint.y,2,0,2*Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(featurePoint.x,featurePoint.y,2,0,2*Math.PI);
      ctx.stroke();
    // See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/arc
    // <your code here>
  }
}

// Draw the dominant emoji on the image
function drawEmoji(canvas, img, face) {
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');

  var face_x_distance = face.featurePoints[4].x-face.featurePoints[0].x;
  var face_y_distance = face.featurePoints[2].y-face.featurePoints[11].y;
  // Set the font and style you want for the emoji
  ctx.font = "normal " + face_y_distance/2 + "px arial";
  ctx.textAlign = 'left';
  // Draw it using ctx.strokeText() or fillText()
  ctx.fillText(face.emojis.dominantEmoji,face.featurePoints[4].x+10,face.featurePoints[4].y);
  var keys = Object.keys(face.emojis);
  var img_y = img.height/(keys.length-1);
  ctx.font = "normal 10px arial";
  keys.map(function(key,i) {
    if (keys !== 'dominantEmoji') {
      // ctx.fillText(String.fromCharCode(emojis[i]), 0, i*20);
      ctx.fillText(key, 0, i*20);
      ctx.fillText(face.emojis[key].toFixed(2)+"%", 40, i*30);
    }
  });
  // See: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText
}

// Define any variables and functions to implement the Mimic Me! game mechanics
var targetEmoji;
var timePerRound=60000; // ms
var timeStart;
var game_state;
var ready_options=["Ready?",3,2,1,"GO!"];
var ready_option = 0;
var correct=0;
var tries=0;

function intialiseDetector(){
  game_state = 'initialising';
}

function resetGame(){
    correct=0;
    tries=0;
    game_state='ready';
    ready_option=0;
    setTimeout(changeReadyState,3000);
}
function startGame(){
    game_state='running';
    nextEmoji();
    timeStart = new Date().getTime();
}
function endGame(){
    game_state = 'stopped';
}
function changeReadyState(){
  ready_option +=1;
  if (ready_option<ready_options.length){
      setTimeout(changeReadyState,1000);
  }else{
      startGame();
  }
}

function drawCenterText(canvas, image, text){
    // Obtain a 2D context object to draw on the canvas
    var ctx = canvas.getContext('2d');
    // Set the font and style
    ctx.font = "normal 120px arial";
    ctx.textAlign="center";
    // Draw it using ctx.strokeText() or fillText()
    ctx.fillText(text,image.width/2,image.height/2+30);
}

function drawReadyTimer(canvas, image){
    drawCenterText(canvas,image,ready_options[ready_option]);
}

function drawGameTimer(canvas, image, timeLeft){
    var ctx = canvas.getContext('2d');
    // Set the font and style
    ctx.font = "normal 30px arial";
    // ctx.textAlign="left";
    ctx.textAlign="right";
    ctx.fillText((timeLeft/1000).toFixed(2),image.width-30,image.height-30);
}

function playRound(){

}

function nextEmoji(){
  var ran = parseInt(Math.random()*emojis.length);
  targetEmoji = emojis[ran];
  setTargetEmoji(targetEmoji);
}

function checkEmojiTarget(emoji_expression){
  if (toUnicode(emoji_expression) === targetEmoji){
    correct+=1;
    setScore(correct,correct+tries);
    nextEmoji();
  }else{
    tries+=1;
    setScore(correct,correct+tries+1);
  }
}

// NOTE:
// - Remember to call your update function from the "onImageResultsSuccess" event handler above
// - You can use setTargetEmoji() and setScore() functions to update the respective elements
// - You will have to pass in emojis as unicode values, e.g. setTargetEmoji(128578) for a simple smiley
// - Unicode values for all emojis recognized by Affectiva are provided above in the list 'emojis'
// - To check for a match, you can convert the dominant emoji to unicode using the toUnicode() function

// Optional:
// - Define an initialization/reset function, and call it from the "onInitializeSuccess" event handler above
// - Define a game reset function (same as init?), and call it from the onReset() function above

// <your code here>
