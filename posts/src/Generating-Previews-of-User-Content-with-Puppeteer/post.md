Headless chrome has been in the toolbox of every great web engineer for some time now, and the introduction of Puppeteer has allowed deep, meaningful integrations into build and test pipelines. What I see far more rarely, however, is headless chrome shining bright outside of these use-cases - luckily the project I am working on has a dark underbelly to illuminate: user generated content.

Imagine you have a situation in which your end-users can produce HTML - maybe not directly, maybe the HTML is generated from Markdown or some other source - but at the end of the workflow, you have markup. Also imagine users will have thier own libraries of markup and corresponding data and you will need to allow them to easily preview and browse thier collection (The floor is made of NDA lava) and you can start to see the use-case for static, pre-rendered previews.

Fortunatley Google Cloud will make all of this very easy for us: serverless functions that support Puppeteer out-of-the-box and Firebase which will trigger said serverless functions effortlessly. Step 1, head over to https://console.firebase.google.com/ and create a new project. Fire up VSCode or your preferred IDE of choice and get into a new workspace. Install/setup dependencies, be sure to select both "hosting" and "functions" when prompted by firebase:

```bash
npm i -g firebase-tools
firebase init
```

Follow the prompts and be sure to initialize 'hosting', 'firestore', 'functions' and 'storage.' Google Cloud's serverless functions require you to install dependencies and compile locally before deploying. From the command line, step into your 'functions' directory that the CLI created for you. We'll need to pull down three libraries, the first is Puppeteer - the second is 'child-process-promise' which does exactly as it advertises, allowing us to spawn a process and recieve it's output as a promise. GCP installs the ImageMagik CLI by default and we'll want to capitalize on that by compressing our generated screenshots. Lastly, we'll install 'firebase-admin' which handles a lot of the necessary setup automagically.

```bash
cd functions
npm i --save puppeteer
npm i --save child-process-promise
npm i --save firebase-admin
```

Awesome! Now that those copy and paste muscles are all fired up, let's open up 'index.js' under the functions directory - we'll want to import our dependencies, initialize our app (firebase automagically acquiring tokens) and create a shell of a function:

```javascript
    const os = require('os');
    const fs = require('fs');
    const admin = require('firebase-admin');
    const functions = require('firebase-functions');
    const puppeteer = require('puppeteer');
    const spawn = require('child-process-promise').spawn;

    admin.initializeApp();

    exports.screenshotter = functions.firestore
    .document('users/{user}')
    .onUpdate(async (change, context) => {

    });
```

So in ~10 lines of code we have our dependencies required, our app acquiring IAM automagically, and a function setup to trigger when any document underneath the 'users' collection gets modified. Easy peasy, lemon squeezy - "but wait!" the astute reader among you is thinking, "what 'users' collection?" Good catch! We'll need to log into the firebase console (or switch open to the tab from earlier, https://console.firebase.google.com/) and head over to the "Database" section under "Develop," right at the top. Create a new database and add a collection to it named "users."

Now everything is setup and we can make Puppeteer work for us! 
![POWER](resource/power.gif "I couldn't help myself")

Let's start by grabbing the data we need, both pre-change and post-change - and critically - let's check if we can fail fast, fail early:

```javascript
    exports.screenshotter = functions.firestore
    .document('users/{user}')
    .onUpdate(async (change, context) => {
        
        const oldDoc = change.before.data();
        const newDoc = change.after.data();

        // If the field we are actioning on has not changed, bail
        if (oldDoc.markup === newDoc.markup) return;

        // Always handle exceptions gracefully! For illustration only, do better! Clean up / release resources!
        const simpleExceptionHandler = err => {
            console.error(err);
            throw err;
        };

        // Initialize Puppeteer
        const browser = await puppeteer.launch({
            args: [
              '--no-sandbox',
              '--headless',
              '--hide-scrollbars',
              '--mute-audio',
              '--disable-gpu'
            ]
        }).catch(simpleExceptionHandler);

        const page = await browser.newPage().catch(simpleExceptionHandler);
    });
```

Once we determine we need to continue, we launch Puppeteer and wait for a new page. Puppeteer has a myriad of options and command line arguments - if you'd like to check them out and tailor to your environment, I encourage you to RTFM @ https://github.com/puppeteer/puppeteer - but for now just roll with these sane defaults. 

Afer waiting for headless chrome to 'boot up' we can now wait for viewport readiness and fill it with content. In the example below I am pulling the size from user settings, but you can of course pull from anywhere you'd like. You'll also notice I am feeding html directly from our firestore document into our page, whereas in production you'd likely *not* be doing this (illustation purposes only, wit.soul === brevity):

```javascript
    
    const page = await browser.newPage().catch(simpleExceptionHandler);

    await page.setViewport({
        width: newDoc.settings.screenshot.width || 1200,
        height: newDoc.settings.screenshot.height || 900,
        deviceScaleFactor: 1,
    }).catch(simpleExceptionHandler);

    await page.setContent(newDoc.markup, {
        waitUntil: "networkidle0" // Wait until all requests are quiet for 500ms, i.e. all page assets fetched
    }).catch(simpleExceptionHandler);
    
```

Awesome! At this point, somewhere on a virtualized piece of memory, deep, deeeeep within a Google Data Center, our headless chrome instance has our page fully rendered. Now we'll need to grab a scratch location to put our images, await Puppeteer following our screenshot command, then use GCP's pre-installed ImageMagik to create a thumbnail:

```javascript

    await page.setContent(newDoc.markup, {
        waitUntil: "networkidle0"
    }).catch(simpleExceptionHandler);

    // Ensure we can write bytes to this location
    const originalScreenshot = path.join(os.tmpdir(), 'original.png');
    const modifiedScreenshot = path.join(os.tmpdir(), 'modified.jpg');

    await page.screenshot({ path: originalScreenshot }).catch(simpleExceptionHandler);

    // Thumbnail ImageMagik
    await spawn('convert', [
        originalScreenshot,
        '-resize',
        `${newDoc.settings.thumbnail.width || 400}x${newDoc.settings.thumbnail.height || 300}`,
        '-quality',
        '92',
        modifiedScreenshot
    ], { capture: ['stdout', 'stderr'] }).catch(simpleExceptionHandler);
    
```

So now we have two beautiful images sitting in a temp directory on an ephemeral linux vm. Let's show off our work! We'll need to send these bad boys to Google Cloud Storage so they can be accessed by the public at large:

```javascript

    // Thumbnail ImageMagik
    await spawn('convert', [
        originalScreenshot,
        '-resize',
        `${newDoc.settings.thumbnail.width || 400}x${newDoc.settings.thumbnail.height || 300}`,
        '-quality',
        '92',
        modifiedScreenshot
    ], { capture: ['stdout', 'stderr'] }).catch(simpleExceptionHandler);

    // Get a reference to our default bucket
    const cloudBucket = admin.storage().bucket();
    
    // Wait for thumbnail upload
    await cloudBucket.upload(modifiedScreenshot, { 
        destination: `thumbnails/${change.after.id}.jpg` 
    }).catch(simpleExceptionHandler);
    
    // Wait for screenshot upload
    await cloudBucket.upload(originalScreenshot, { 
        destination: `screenshots/${change.after.id}.jpg` 
    }).catch(simpleExceptionHandler);

    // Be kind, rewind! (Clean up scratch on VM)
    fs.unlinkSync(originalScreenshot);
    fs.unlinkSync(modifiedScreenshot);

    // Release the browser!
    await browser.close().catch(simpleExceptionHandler);

    // End func
    return true;
    
```

Once we have waited for Google's storage library to do the heavy lifting for us, we simply clean up after ourselves and power down. Keep in mind you would also need to make your cloud bucket publicly accessable by giving 'allUsers' read access in it's AIM policy. Additionally, you would need some business logic to get that url into your application, perhaps updating the users firestore document? That goes beyond the scope of this post; The choice is yours. 