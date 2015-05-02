'use strict'

let init, ui, operations, chromeApp, debug

chromeApp = Boolean(chrome && chrome.permissions)
debug = false

/*export init;
export ui;
export operations;*/



let bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }; //from coffeescript's => operator
//use in a class's constructor to make the this pointer always refer to the object in which a function resides
function fixThisPointer(_this, func){return
  _this[func.name] = bind(_this[func.name], _this);
}
function fixThisPointer2(_this, funcNameArray){
  for (name of funcNameArray){return
    _this[name] = bind(_this[name], _this);
  }
}
/*
//makes an object's function always have the this variable point to the object
//http://stackoverflow.com/questions/5842654/javascript-get-objects-methods
function thisFixer(obj){
  console.log('myobj', obj)
  for (let x in obj){
    console.log('checking', x)
    if (typeof(x) === 'function'){
      obj[x.name] = bind(obj[x.name], obj);
    }
  }
}*/

//only works in the next version of Chrome
//stores pic objects
/*class Pics extends Map{

  constructor(){
    super()
    fixThisPointer(this, this[Symbol.iterator])
    //this.sliderListener = bind(this[Symbol.iterator], this);
  }

  //adds a pic to the UI and to this object
  add(pic){
    if (!this.get(pic.name)){
      this.set(pic.name, pic)
      ui.addPic(pic)
    }
  }

  //removes a pic to the UI and to this object
  remove(picName){
    ui.removePic(this.get(picName))
    this.delete(picName);
  }

  * [Symbol.iterator]() {
    for (let pic in this.values()) {
      yield pic;
    }
  }

}*/

class Pics extends Object{

  constructor(){
    super()
    this._pics = {};
    this.sliderListener = bind(this.a, sliderListener);
  }

  //add a pic object
  add(pic){
    this[pic.name] = pic;
    this._pics[pic.name] = this[pic.name];
    ui.addPic(pic)
  }

  //remove a pic object with the name picName
  remove(picName){
    ui.removePic(this.get(picName))
    delete this._pics[picName];
    delete this[picName];
  }

  get pics(){
    return this._pics;
  }

  values(){
    let vals = []
    for (let key in this._pics) {
      vals.push(this._pics[key])
    }
    return vals
  }

  keys(){
    let keys = []
    for (let key in this._pics) {
      keys.push(key)
    }
    return keys
  }
  
  get size(){return Object.keys(ui.pics._pics).length}

  get(name){return this._pics[name]}

  set(name, pic){this._pics[name]=pic}
}

//storing picture data in an object so data can be passed by reference
class RawPicData{ constructor(data){this.data = data; Object.freeze(this)} }


class BasePic{
  constructor(dataObj, name) {
    this.name = name || Math.random();
    this._width;
    this._height;
    this.dataObj = dataObj

    Object.defineProperty( this, 'data', {
    get: function(){ return this.dataObj.data },
    set: function(){ 'cannot change data' },
    configurable: false,
    enumerable: true
    });
  }

  //returns an html element created from this object
  toHtml(){
    let img = document.createElement('img');
    img.src = this.data;
    img.title = this.name;
    img.setAttribute('crossOrigin', 'anonymous');
    return img;
  }
  toString(){
    return `<img src="${this.data}" title="${this.name}" />`;
  }

  get width(){
    if (this._width) return this._width;
    this._width = this.toHtml().width;
    return this._width;
  }
  get height(){
    if (this._height) return this._height;
    this._height = this.toHtml().height;
    return this._height;
  }
}

//Used by pic to store alternate forms of the pic (for example to store a pic's compressed form)
class _ChildPic extends BasePic{
  constructor(parentPicObj, dataObj){
    super(dataObj, parentPicObj.name)
    this.parent = parentPicObj;
    let html = this.toHtml()
    this.toHtml = function(){return html}
    this.width;
    this.height;
    this.compress = function(x,w,h){return parentPicObj.compress(x,w,h)}
    Object.freeze(this)
  }
}


//compresses pictures, and stores picture info
class Pic extends BasePic{

  //ceates a Pic object from rawData. Name will be the img element title. Type defaults to "image/jpeg", can also be image/webp (chrome only) or image/png.
  constructor(rawDataObj, name, type){
    super(rawDataObj, name)
    this.original = new _ChildPic(this, rawDataObj);

    //create a downsized preview to be used when outputting to canvas
    let storeWidth = ui.canvas.width;
    let storeHeight = ui.canvas.height;

    /*if (this.width > this.height){
      ui.canvas.displayPic(this.original, 1024, null);
    }
    else{
      ui.canvas.displayPic(this.original, null, 1024);
    }*/
    if (this.original.width < 600){
      ui.canvas.displayPic(this.original, 600);
    }else{
      ui.canvas.displayPic(this.original);
    }
    this.preview = new _ChildPic(this, ui.canvas.compressCanvas(95));
    ui.canvas.width = storeWidth;
    ui.canvas.height = storeHeight;

    this.compressed = {};
    this.name = name;
    if (!this.type) { this.type = "image/jpg"; }
    this._thumbnail;
  }

  //returns an image element compressed by amount and downsized by width and height
  compress(amount, width, height){

    let compressedPic = this.compressed[`${amount}, ${width}, ${height}`]
    if (compressedPic) { return compressedPic }

    ui.canvas.displayPic(this.preview, width, height);
    compressedPic = new _ChildPic(this, ui.canvas.compressCanvas(amount));
    ui.canvas.displayPic(compressedPic);

    this.compressed[`${amount}, ${width}, ${height}`] = compressedPic;
    return compressedPic;
  }

  thumbnail(){
    if (!this._thumbnail) {
      //let canvasPic = ui.canvas.displayedPic;
      let storeWidth = ui.canvas.width;
      let storeHeight = ui.canvas.height;
      ui.canvas.displayPic(this.preview, 150, 100);
      this._thumbnail = new _ChildPic(this, ui.canvas.compressCanvas(50));
      ui.canvas.displayPic(this._thumbnail, 150, 100);
      ui.canvas.width = storeWidth;
      ui.canvas.height = storeHeight;
      //if (canvasPic) ui.canvas.displayPic(canvasPic);
    }
    return this._thumbnail
  }
}

class Operations{

  constructor(){
    this.operations = {}
  }

  before(pic){
    ui.canvas.displayPic(pic.preview);
    return ui.canvas.toPixelObj()
  }

  after(pixelObj){
    ui.canvas.displayPixelObj(pixelObj)
  }

  wrapper(opFunc){
    return function operationWrapper(){
    try{
      let pixelObj = this.before(arguments[0]) //TODO allow arguments[0] to be a pixelObj in addition to being a pic object

      let pixels = pixelObj.data
      let args = [pixels]
      args.push.apply(args, arguments)
      opFunc.apply(this, args)

      this.after(pixelObj)
      return new _ChildPic(arguments[0], ui.canvas.toRawDataObj())
    }catch(err){
      console.log(err)
      ui.error(err)
    }
    }
  }

  register(func, uiObj, displayName, description, version, email){
    this.operations[func.name] = {'version':version, 'displayName':displayName, 'operation':func, 'ui':uiObj, 'description':description, email:email}
    this[func.name] = this.wrapper(func)
  }
}
operations = new Operations()

function grayscale(pixels, pic) {

  let aPix = pixels
  let nPixLen = aPix.length;

  for (var i = 0; i < pixels.length; i += 4) {
    pixels[i+2] = pixels[i+1] = pixels[i] = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
  }

  /*for (let nPixel = 0; nPixel < nPixLen; nPixel += 4) {
    aPix[nPixel + 2] = aPix[nPixel + 1] = aPix[nPixel] = (aPix[nPixel] + aPix[nPixel + 1] + aPix[nPixel + 2]) / 3;
  }*/
}
operations.register(grayscale, null, 'grayscale', 'create a grayscale version of an image', '1.0')

function invert(pixels) {
  for (var i = 0; i < pixels.length; i += 4) {
    pixels[i]     = 255 - pixels[i];     // red
    pixels[i + 1] = 255 - pixels[i + 1]; // green
    pixels[i + 2] = 255 - pixels[i + 2]; // blue
  }
}
operations.register(invert, null, 'invert', 'invert an image', '1.0')

function compressAndDownsize(pixels, pic, amount, width, height) {

    console.log('pic', pic, 'amount', amount, 'width', width, 'height', height)
    
    ui.canvas.displayPic(pic, width, height, true);
    ui.canvas.width = width;
    ui.canvas.height = height;
    //ui.canvas.refresh()
    let compressedPic = new _ChildPic(this, ui.canvas.compressCanvas(amount));
    ui.canvas.displayPic(compressedPic);

    return compressedPic;
}
operations.register(compressAndDownsize, null, 'compress', 'compresses and downsizes an image', '1.0')

function onlineTest(){ui.pics.add(new Pic(new RawPicData('http://i.imgur.com/rE1OxtK.jpg')))}

class Canvas{
  constructor(canvasE){
    this.canvas = canvasE;
    this.context = this.canvas.getContext('2d');
    this.displayedPic;
    fixThisPointer2(this, ['displayE', 'displayPic', 'compressCanvas', 'refresh', 'clear'])
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.maxWidth = 1500;
    this.maxHeight = 1500;
  }

  get width()  { return this.canvas.width; }
  get height() { return this.canvas.height; }
  set width(val)  { this.canvas.width  = val; }
  set height(val) { this.canvas.height = val; }

  get maxWidth()  {
    let containerWidth = ui.imagesContainerSize()[0]
    if (containerWidth-250 > this._maxWidth){
      return this._maxWidth
    } else if (containerWidth-250 > 50) {
      return containerWidth-250
    } else {
      return 50
    }
  }
  get maxHeight()  {
    let containerHeight = ui.imagesContainerSize()[1]
    if (containerHeight > this._maxHeight){
      return containerHeight
    } else {
      return this._maxHeight
    }
  }
  set maxWidth(val)  { this._maxWidth  = val; }
  set maxHeight(val) { this._maxHeight = val; }

  displayedPicIfNew(picObj, width, height){
    if (picObj==this.displayedPic && width==this.width && height==this.height && !forceRefresh) {
      return this.displayedPic
    }
    return displayPic(picObj, width, height)
  }

  displayPic(picObj, width, height, force){

    let p  = picObj;

    let w  = width,
        h  = height;

    let w2 = p.width,
        h2 = p.height;

    if ( ((!w && !h) || (w > this.maxWidth)) && !force){
      w = this.maxWidth
    }
    if (!h) h = w * ( h2 / w2)
    if (h > this.maxHeight && !force) return this.displayPic(p, null, this.maxHeight)
    if (!w) w = h * (w2 / h2)

    this.width = w;
    this.height = h;
    this._displayE(p.toHtml())
    this.displayedPic = p
    return p
  }

  _displayE(imgE){
    let w = this.width,
        h = this.height;

    this.context.clearRect(0, 0, w, h);
    this.context.drawImage(imgE, 0, 0, w, h);
  }

  refresh(){
    this.clear()
    this.displayPic(this.displayedPic, this.width)
    //this._displayE(this.displayedPic.toHtml())
  }

  clear(){
    this.context.clearRect(0, 0, this.width, this.height);
  }

  compressCanvas(amount){
    amount /= 100;
    return new RawPicData( this.canvas.toDataURL('image/jpeg', amount) );
  }

  toRawDataObj(){return this.compressCanvas(100)}

  //a pixel object is an ImageData object -- https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
  toPixelObj() {return this.context.getImageData(0, 0, this.width, this.height)}
  displayPixelObj(dataObj) {return this.context.putImageData(dataObj, 0, 0)}

}

//renders changes that need to appear in the UI
class MainUI{

  constructor(){
    this.pics = new Pics();
    this.canvas = new Canvas(document.getElementById('canvas'));
    this.progressBar = this.createProgressBar();
    this.dropBoxE = document.getElementById('dropbox');


    document.getElementById('slider').addEventListener('change', sliderListener);
    document.getElementById('amount').addEventListener('change', sliderListener);
    document.getElementById('download').addEventListener('click', downloadListener);

    this.addPic = bind(this.addPic, this);
    this.removePic = bind(this.removePic, this);
  }

  //gets called every time an object is added to this.pics
  addPic(pic){

    let imgWrapper = document.createElement('span') /////need to change to div to get close button in place, but needs to be span to show thumbnails properly
    imgWrapper.style.position = 'relative'
    //imgWrapper.style.display = 'block'
    imgWrapper.setAttribute('pic-name', pic.name)

    let close = document.createElement('span')
    close.classList.add('x');
    close.classList.add('thumb-x');
    close.addEventListener('click', removePicListener)

    let img = pic.thumbnail().toHtml();
    img.classList.add('thumb');

    imgWrapper.appendChild(img)
    imgWrapper.appendChild(close)
    document.getElementById('image-list').insertBefore(imgWrapper, null);

    pic.compress(ui.amount)
  }

  //gets called every time an object is removed from this.pics
  removePic(pic){
    document.querySelector(`#image-list [pic-name="${pic.name}"]`).remove()

    if (this.pics.size <= 1) return this.canvas.clear()

    if (pic.name == ui.canvas.displayedPic.name){
      for (let p of this.pics.values()){
        if (p.name != pic.name){
          this.canvas.displayPic(p)
          return
        }
      }
    }
  }

  get amount(){
    return parseInt( document.querySelector('#amount').value, 10);
  }

  set amount(val){
    document.querySelector('#amount').value = val;
    document.querySelector('#slider').value = val;
  }

  * getCompressedPics(){
    for (let pic of this.pics.values()){
      yield operations.compressAndDownsize(pic, ui.amount, pic.original.width, pic.original.height);
    }
  }
  
  msg(message){
    let msgE = document.createElement('p');
    msgE.innerText = message;
    return this.msgFromElement(msgE)
  }
  
  msgFromElement(msgE, fadeLength, timeTillFade){
    let msgWrapperE = document.createElement('div');

    msgWrapperE.classList.add('message');
    msgE.classList.add('inner-message');

    msgWrapperE.appendChild(msgE);
    msgWrapperE.setAttribute('msg-id', Math.random())
    let msg_list = document.getElementById('message-list');
    msg_list.insertBefore(msgWrapperE, document.querySelector('#message-list > .message:first-of-type'));

    if (fadeLength != false) fade(msgWrapperE, fadeLength, timeTillFade);
  }
  
  rmMsg(msgId){
    document.querySelector(`#message-list [msg-id="${msgId}"]`).remove()
  }

  error(msg, title, details, autoClose, logError){
    if (autoClose==undefined) autoClose=false;
    if (logError==undefined) logError=true;
    if (msg instanceof CompressorError) {return msg} //allows try{}catch(err){ui.err} to create a new CompressorError only if err isn't already a CompressorError
    if (!title) title = 'Error'
    let err = new CompressorError(title, msg, details, logError)
    err.display(autoClose)
    return err
  }
  
  createProgressBar(){
    let pBarE = document.getElementById('progress_bar'); //TODO create element instead
    return new progressBar(pBarE);
  }

  set UploadBtnActiveState(bool){
    document.querySelector('#dropbox2 > .yellow-button').classList.toggle('disabled', !bool);
  }
  get UploadBtnActiveState(){
    return !document.querySelector('#dropbox2 > .yellow-button').classList.contains('disabled');
  }

  imagesContainerSize(){
    let container = document.getElementById('images-container')
    return [container.offsetWidth, container.offsetWidth]
  }

}


//TODO in the future this will be used to create different progress bars for each picture
class progressBar{

  constructor(pBarE) {
    this.e = pBarE;
    this.progressE = document.querySelector('#progress')
    fixThisPointer2(this, ['progress', 'visible']);
    this.progress(0);
    this.visible = false;
  }

  progress(amount){
    this.e.setAttribute('value', amount);
    //this.progressE.style.width = amount + '%';
    this.progressE.textContent = amount + '%';
  }

  set visible(bool){
    this.e.classList.toggle('loading', bool);
    this.progressE.classList.toggle('loading', bool)
  }
}

function downloadListener(){ return download() }

function download(zipFiles) {
  
  if (!ui.pics.size) throw ui.error('nothing to download', 'Download Error', 'ui.pics.size=='+ui.pics.size)
  
  if (zipFiles){
      throw new CompressorError('Not Implemented Error', 'waiting for Chrome to implement es6 imports')
      //document.writeln("<script src=" + 'JSZip/JSZip.js' + "><" + "/script>");
      //from libs.JSZip import * //this feature hasn't been implemented in Chrome as of 4/22/15
      console.log(JSZip)
      itemCount = ui.pics.size;
      let zip = new JSZip();
      images = zip.folder('images')
      for (let pic of ui.getCompressedPics()){
        images.file(pic.name, pic.data, {base64:true});
      }
      saveAs(zip.generate({type:"blob"}), "images.zip");
  }

  if (chromeApp){

    function b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        var byteCharacters = atob(b64Data);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);

            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            var byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        var blob = new Blob(byteArrays, {type: contentType});
        return blob;
    }
    chrome.fileSystem.chooseEntry({type:'openDirectory'}, function(entry) {
      for (let pic of ui.getCompressedPics()){
        let picName = pic.name;
        if (!pic.name.endsWith('.jpg')){
          picName = pic.name + '.jpg';
        }
        chrome.fileSystem.getWritableEntry(entry, function(entry) {
          entry.getFile(picName, {create:true}, function(entry) {
            entry.createWriter(function(writer){
              writer.write(b64toBlob(pic.data.slice(23), 'image/jpg'))
            })
          })
        })
      }
      reset();
      ui.msg('Downloading')
    })
    
  }else{
    for (let pic of ui.getCompressedPics()){
      let a = document.createElement("a");
      a.href = pic.data;
      if (pic.name.endsWith('.jpg')){
        a.download = pic.name;
      }
      else{
        a.download = pic.name + '.jpg'
      }
      document.body.appendChild(a)
      a.click();
      window.URL.revokeObjectURL(a.href);
      a.remove()
    }
    reset();
    ui.msg('Downloading')
  }
  
}

function reset(){
  for (var picName of ui.pics.keys()) ui.pics.remove(picName)
  ui.canvas.clear();
}



function registerFileListeners(){
  document.getElementById('files').addEventListener('change', fileInputListener);
  document.getElementById("dropbox2").addEventListener('click', fileInputClick);
  document.getElementById("openFileOpener").addEventListener("click", fileInputClick2);
}


//The open file dialogue will only be shown on a click event to a file input element,
//so to make the parent element open the open file dialogue
//we fire a click event on the file input whenever the parent element is clicked
function fileInputClick(e){
  if (ui.UploadBtnActiveState){
    ui.UploadBtnActiveState = false;
    let clickEvent = new CustomEvent("click",{"from":"fileInputClick"});
    document.getElementById("openFileOpener").dispatchEvent(clickEvent);
  }
}
function fileInputClick2(e) {
  document.getElementById("files").click();
  e.preventDefault();
  ui.UploadBtnActiveState = true;
}

let currentFileInputListener = null;
function fileInputListener(e){
    //UI changes that happen after uploading must go in a file listener if those changes also need to take affect when the user cancels the file upload dialogue
    ui.UploadBtnActiveState = false;
    currentFileInputListener = new ImageFileReader(e.target.files);
    ui.progressBar.visible = false;
    ui.UploadBtnActiveState = true;
}
class ImageFileReader{

  constructor(files){
    fixThisPointer2(this, ['readInFiles', 'fileStart', 'fileEnd', 'fileCancel', 'fileErrorHandler', 'createOnLoadHandler', 'updateProgress'])
    this.reader;
    this.readInFiles(files);
  }

  readInFiles(files){
    files = [].slice.call(files);
    files = files.filter(function(p){return (p.type.match('image.*'));})

    for (let file of files){
      this.reader = new FileReader();
      ui.progressBar.progress(0);

      this.reader.onloadstart = this.fileStart;
      this.reader.onprogress = this.updateProgress;
      this.reader.onload = this.createOnLoadHandler(file);
      this.reader.onloadend = this.fileEnd;
      this.reader.onerror = this.fileErrorHandler;

      this.reader.readAsDataURL(file);
    }
  }

  fileStart(){
    ui.progressBar.visible = true;
    ui.UploadBtnActiveState = false;
  }

  updateProgress(e){
    if (e.lengthComputable) {
        let progress = Math.round((e.loaded / e.total) * 100);
        if (progress < 100) {
        ui.progressBar.progress(progress)
      }
    }
  }

  fileEnd(){
    ui.progressBar.visible = false;
    ui.UploadBtnActiveState = true;
  }

  createOnLoadHandler(file){
    let name = file.name
    let type = file.type
    function onLoad(e){
      let data = new RawPicData(e.target.result)

      ui.pics.add( new Pic(data, name, type) );
      ui.progressBar.progress(100);
    }
    return onLoad
  }

  fileCancel() {
    this.reader.abort();
    ui.progressBar.progress(0);
    ui.progressBar.visible = false;
    ui.UploadBtnActiveState = true;
  }

  fileErrorHandler(e) {
    switch(e.target.error.code) {
      case e.target.error.NOT_FOUND_ERR:
        ui.error('Image not found');
        break;
      case e.target.error.NOT_READABLE_ERR:
        ui.error('Image is not readable');
        break;
      case e.target.error.ABORT_ERR:
        break;
      default:
        ui.error('An error occurred while reading the Image');
    };
    this.fileCancel()
  }
}


class DraggableImageFileReader{
  static dragover(e) {
    e.stopPropagation();
    e.preventDefault();
    ui.dropBoxE.classList.add('drag-over');
  }
  static dragenter(e) {
    e.stopPropagation();
    e.preventDefault();
  }
  static dragleave(e) {
    e.stopPropagation();
    e.preventDefault();
    ui.dropBoxE.classList.remove('drag-over');
  }
  static dragstart(e){
    e.stopPropagation();
    e.preventDefault();
    /*let img = ''
    e.dataTransfer.setDragImage(img, -1, 1)*/
  }
  static dragend(e) {
    e.stopPropagation();
    e.preventDefault();
    ui.dropBoxE.classList.remove('drag-over');
  }
  static drop(e) {
    e.stopPropagation();
    e.preventDefault();
    ui.dropBoxE.classList.remove('drag-over');

    currentFileInputListener = new ImageFileReader(e.dataTransfer.files);
  }
  static initDrop(){
    let dropbox = ui.dropBoxE;
    dropbox.addEventListener("dragenter", this.dragenter);
    dropbox.addEventListener("dragleave", this.dragleave);
    dropbox.addEventListener("dragover", this.dragover);
    dropbox.addEventListener("dragend", this.dragend);
    dropbox.addEventListener("dragstart", this.dragstart);
    dropbox.addEventListener("drop", this.drop);
  }
}


class CompressorError{ //TODO inherit off of Error in the next version of chrome so I can get the stack trace

  constructor(title, message, technicalDetails, logError){
    
    if (title == undefined) title=''
    if (message == undefined) message=''
    if (technicalDetails == undefined) technicalDetails=''
    
    this.title = title
    this.message = message
    this.technicalDetails = technicalDetails
    
    if (debug) console.log("'" + title + "' error detected")
    
    if (logError && logError.iterator){
      this.logWhenDisplayed = debug || logError[0]
      if (logError[1]){
        //TODO log error to the server
        throw new CompressorError('Not Implemented', 'need to add the ability to communicate back with the server')
      }
    }
    else{
      this.logWhenDisplayed = logError
    }
  }

  toHtml(){
    let errorE = document.createElement('div')
    
    errorE.innerHTML                             = "<div><div class='x'></div>";
    if (this.title) errorE.innerHTML            += `<h2>${this.title}</h2>`;
    if (this.message) errorE.innerHTML          += `<p>${this.message}</p>`;
    if (this.technicalDetails) errorE.innerHTML += `<hr/><details><summary>Technicalities</summary>${this.technicalDetails}</details></h2>`;
    errorE.innerHTML                            += '</div>';

    errorE.classList.add('error')
    errorE.querySelector('.x').addEventListener('click', function(e){ui.rmMsg(e.target.parentNode.parentNode.parentNode.getAttribute('msg-id'))})
    
    return errorE
  }

  toString(){
    return `\nError: ${this.title}\nReason: ${this.message}\nAdditional Details: ${this.technicalDetails}`
  }

  display(autoClose){
    if (this.logWhenDisplayed){
      console.log(this.toString())
      //TODO try to send the error back to the server
    }
    if (autoClose || autoClose==undefined) autoClose=400
    ui.msgFromElement(this.toHtml(), autoClose, 400)
  }
}


function removePicListener(e){
  ui.pics.remove(e.target.parentNode.getAttribute('pic-name'))
}


function sliderListener(e){
  ui.canvas.displayedPic.compress(ui.amount)
}
function sliderChange(val) {
  ui.amount = val
  /*if (chromeApp){
    chrome.storage.local.set({'amount': val});
  }else{
    localStorage.setItem('amount', val);
  }*/
}
function sliderNumChange(val) {
  sliderChange(val)
}


function fade(e, length, wait) {
  if (length == undefined) length = 400
  if (!wait) wait = 0
  setTimeout(function(){
    let alpha = 1;
    let timer = setInterval(function () {
        if (alpha <= 0.4){
            clearInterval(timer);
            e.remove();
        }
        e.style.opacity = alpha;
        //e.style.filter = 'alpha(opacity=' + alpha * 100 + ")";
        alpha -= 1 / (alpha * alpha * (length / 10));
    }, length);
  }, wait);
}

function firstVisit(){
  return null//I think I need to change the type of data that the picture is in before I create a picture object with it.
  if (!localStorage.getItem('first-visit')){
    let pic = new Pic(data, 'http://compressor.mrme.me/example_pic.jpg')
    ui.pics.add(pic)
  }
  localStorage.setItem('first-visit', true)
}


init = function() {
  let compressionAmount;
  
  if (chromeApp){
    compressionAmount = chrome.storage.local.get('amount', function(item){return item}) || '70';
  }else{
    compressionAmount = localStorage.getItem('amount') || '70';
  }
  
  document.querySelector('#amount').value = compressionAmount;
  document.querySelector('#slider').value = compressionAmount;

  if (chromeApp) document.querySelector('#download').innerHTML = '&nbsp; save &nbsp;';
  
  ui = new MainUI();

  DraggableImageFileReader.initDrop()
  registerFileListeners()

  //prevent redirecting to dropped images
  document.body.addEventListener('drop', function(e)      { e.preventDefault(); e.stopPropagation(); });
  document.body.addEventListener('dragover', function(e)  { e.preventDefault(); e.stopPropagation(); });
  document.body.addEventListener('dragenter', function(e) { e.preventDefault(); e.stopPropagation(); });

  //Add some listeners //TODO move these listeners elsewhere
  document.getElementById('files').addEventListener('change', fileInputListener);
  document.getElementById('files').addEventListener('change', fileInputListener);
  document.getElementById('slider').addEventListener('change', function(e){return sliderChange(parseInt(  document.querySelector('#slider').value, 10))});
  document.getElementById('slider').addEventListener('input', function(e){return sliderChange(parseInt( document.querySelector('#slider').value, 10))});
  document.getElementById('amount').addEventListener('change', function(e){return sliderNumChange(ui.amount)});
  
  //firstVisit()
}

window.onload = init
