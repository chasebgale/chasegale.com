title: "Raster Text In HTML5's Canvas"
date: 2011-09-12 12:22:53
tags:
---
I love HTML5′s canvas. Armed with only a modern browser, we now have access to a plethora of drawing/imaging functionality with no third-party plugins required. Unfortunately, life isn’t all sunshine quite yet, echoed across the web is one resounding cry: "[drawText is performance murder.](http://simonsarris.com/blog/322-canvas-drawtext-considered-harmful)" Even more unfortunately, the project I am currently building requires heaps (pun intended) of drawText() calls.

So, what to do? How do we quickly get a block of text onto a canvas? The answer is to manipulate the pixels of the canvas directly. I feel that code speaks louder than words, so let’s jump right in. First, you’ll need an image that represents our font:

{% asset_img bitmapfont_source.png %}

As you can see, I am using a bitmap font (no anti-aliasing) and I am outputting all characters in order, starting at charcode 33. **Note: The lookup function we are going to write today depends entirely on these characters being in order.** The next step is to load the font image into an off-screen buffer, or in our particular case, a hidden canvas element.

```javascript
var fontImage = new Image();
fontImage.onload = function(){
  var bufferCanvas = document.getElementById("bufferCanvas");
  var bufferContext = bufferCanvas.getContext("2d");
 
  bufferContext.drawImage(fontImage, 0, 0, 566, 7);
};
fontImage.src = "bitmapfont.png";
```

Now that we have our image drawn into the canvas, we are able to extract a representative array of pixels and begin processing them. The idea is to iterate over each block (every 4 elements of the array correspond to red, green, blue and alpha channels of a single pixel) and record the significant points for each character.

```javascript
    var fontPoints = new Array();
    var fontImage = new Image();
    fontImage.onload = function(){
        var bufferCanvas = document.getElementById("bufferCanvas");
        var bufferContext = bufferCanvas.getContext("2d");
 
        bufferContext.drawImage(fontImage, 0, 0, 566, 7);
 
        var w = 566;
        var fontPixelArray = bufferContext.getImageData(0, 0, w, 7);
 
        // Store pointer directly to array of data to speed up lookups
        var fontPixelData = fontPixelArray.data;
        var total = -1;
        var x = 0;
        var y = 0;
        var index = -1;
        var pointsLength = -1;
 
        for (var i=0; i < 95; i++) {
            // Each array element is an array that stores relative x and y coordinates
            fontPoints[i] = new Array();
        }
 
        for (var i=0; i < fontPixelData.length; i++) {
            // Add up the R, G, B values
            total = fontPixelData[i] + fontPixelData[i+1] + fontPixelData[i+2];
            
            // If the total = 0 it's a black pixel, if not, we need to record it
            if (total > 0) {
                x = i / 4 % w;
                y = ( i / 4 - x) / w;
 
                // We can derive the character index by dividing by the character width
                index = Math.floor(x/6);
 
                x = x - (index * 6);
 
                pointsLength = fontPoints[index].length;
 
                fontPoints[index][pointsLength] = {x: x, y: y};
            }
            
            i += 3;
        }
        
    };
    fontImage.src = "bitmapfont.png";
```

As illustrated above, we first create an array containing 94 child arrays – each will hold the significant points of the associated glyph; next, we iterate over the CanvasPixelData array in chunks of 4, screening out black pixels. Once we come upon a non-black point, we derive it’s relative coordinates and character index, then add the point to the appropriate array.

At this point, we have an array of coordinates to reproduce every glyph in our original image. As I’m sure you have anticipated, we now need a method we can invoke that will imprint these coordinates onto an existing image. Again, code speaks louder than words:

```javascript
function setPixel(imageData, x, y, r, g, b, a) {
    index = (parseInt(x) + parseInt(y) * imageData.width) * 4;
    imageData[index+0] = r;
    imageData[index+1] = g;
    imageData[index+2] = b;
    imageData[index+3] = a;
}
 
function rasterText(imageData, text, x, y) {
    var len = text.length;
    var i = 0;
    var code = 0;
    var characterPixelLength = -1;
    
    var startX = x;
    var startY = y;
    
    for (i=0; i < len; i++) {
        code = text.charCodeAt(i) - 33;
        
        if (code > -1) {
            characterPixelLength = fontPoints[code].length;
            
            for (var j=0; j < characterPixelLength; j++) {
                setPixel(imageData,
                        startX + fontPoints[code][j].x,
                        startY + fontPoints[code][j].y,
                        255, 255, 255, 0xFF);
            }
        }
        
        startX += 6;
    }
}
```

Our new "rasterText" method accepts a string as one of it's parameters. For each character in this string, we lookup the number of points required to reproduce it, then for each of those points, we call the helper method "setPixel." You'll also notice on line 19, we determine the index in our array by subtracting 33 from the character code. A space resolves to -1, but you'll notice we increase our "startX" outside that condition, so the space is preserved.

Here is how we would use this method from start to finish:

``` javascript
var destinationCanvas = document.getElementById("destinationCanvas");
var context = destinationCanvas.getContext("2d");
var imageData = context.getImageData(0, 0, context.width, context.height);
 
rasterText(imageData.data, "Hello World!", 10, 10);
 
context.putImageData(imageData, 0, 0);
```

Awesome! However, I'm sure upon reflection you'll be identifying the limitations of this technique. Namely, you'll need to load and pre-process a different image for each font face and font size. Up front costs in terms of your effort, sure, but during testing my aforementioned project, text rendering time was reduced by a mean ~20%.

In closing, the method we built here today is by no means a nail in the text-rendering-poor-performance coffin. What it is, however, is another tool in your arsenal - I urge you to treat it like a scalpel, not a hammer.