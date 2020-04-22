Headless chrome has been in the toolbox of every great web engineer for some time now, and the introduction of Puppeteer has allowed deep, meaningful integrations into build and test pipelines. What I see far more rarely, however, is headless chrome shining bright outside of these use-cases - luckily the project I am working on has a dark underbelly to illuminate: user generated content.

Imagine you have a situation in which your end-users can produce HTML - maybe not directly, maybe the HTML is generated from Markdown or some other source - but at the end of the workflow, you have markup. Also imagine users will have thier own libraries of markup and corresponding data and you will need to allow them to easily preview and browse thier collection (The floor is made of NDA lava) and you can start to see the use-case for static, pre-rendered previews.

Google Cloud will make all of this very easy for us, serverless functions that support Puppeteer out-of-the-box and Firebase which will trigger said serverless functions effortlessly. Best of all, free tier so you can play along without any risk: Step 1, head over to https://console.firebase.google.com/ and create a new project. Fire up VSCode or your preferred IDE of choice and get into a new workspace. Install/setup dependencies, be sure to select both "hosting" and "functions" when prompted by firebase:

```bash
npm i -g firebase-tools
firebase init
```

Google Cloud's serverless functions require you to install dependencies and compile locally before deploying. From the command line, step into your 'functions' directory. We'll need to pull down three libraries, the first is Pupeteer - the second is 'child-process-promise' which does exactly as it advertises, allowing us to spawn a command line process and recieve it's output as a promise. GCP installs the ImageMagik CLI by default and we'll want to capitalize on that by compressing our generated screenshots. Lastly, we'll install 'firebase-admin' which handles a lot of the necessarry setup automagically.

```bash
cd functions
npm i --save puppeteer
npm i --save child-process-promise
npm i --save firebase-admin
```

