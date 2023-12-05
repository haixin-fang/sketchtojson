import sketch2json from "./sketch2json/index";
import layerParser from "./parser/layerParser";
import { Buffer as a } from "buffer";
if (typeof window.Buffer === "undefined") {
  window.Buffer = a;
}
class Sketch {
  constructor(uploadUrl, uploadCallback) {
    // 存储模板json
    this.uploadUrl = uploadUrl;
    this.uploadCallback = uploadCallback;
  }

  async init(file) {
    const data = await new Promise((resolve) => {
      sketch2json(file).then((data) => {
        resolve(data);
      });
    });
    if (data.image) {
      this.image = data.image;
    }
    const newlist = [];
    try {
      Object.values(data.pages).forEach((data) => {
        newlist.push(layerParser(data));
      });
    } catch (e) {
      return;
    }

    const result = [];
    newlist.forEach((item) => {
      if (item.type == "page") {
        result.push(this.getLayer(item.childrens));
      }
    });
    const designs = await Promise.all(result);
    const sketchjson = designs.reduce((now, next) => {
      return now.concat(next);
    });
    console.log(sketchjson);
    return sketchjson;
  }

  //   一个页面可能有n个设计稿
  async getLayer(workspaces) {
    const list = [];
    const resultList = [];
    workspaces.forEach((item) => {
      const result = [];
      list.push(Promise.all(this.getSketchJson(item.childrens, null, result)));
      resultList.push(result);
    });
    await Promise.all(list);
    return resultList;
  }
  dataURItoBlob(dataURI) {
    var byteString;
    if (dataURI.split(",")[0].indexOf("base64") >= 0) byteString = atob(dataURI.split(",")[1]);
    else byteString = unescape(dataURI.split(",")[1]);
    var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], {
      type: mimeString,
    });
  }
  slfileUpload(blob, fileName, base64) {
    return new Promise((resolve) => {
      if (this.uploadUrl) {
        /* FormData 是表单数据类 */
        var fd = new FormData();
        var ajax = new XMLHttpRequest();
        /* 把文件添加到表单里 */
        fd.append("file", blob, fileName);
        ajax.open("post", this.uploadUrl, true);
        ajax.onload = () => {
          try {
            const url = this.uploadCallback(ajax.responseText);
            resolve(url);
          } catch (e) {
            console.error(e);
            resolve();
          }
        };
        ajax.send(fd);
      } else {
        resolve(base64);
      }
    });
  }
  getSketchJson(childrenList, resolve, list) {
    let outProArr = [];
    Array.from(childrenList).forEach((e, i) => {
      let outPro = new Promise((res) => {
        const { width, height, x: left = 0, y: top = 0 } = e.frame;
        let value = {};
        value.left = left;
        value.top = top;
        value.width = width;
        value.height = height;
        value.visible = e.isVisible;
        value.id = e.id;
        value.name = e.name;
        value.opacity = e.style.opacity;
        value.fill = e.style.backgroundColor;
        // console.log(e.type);
        // 顶级图层/文件夹
        if (e.type == "shapeGroup" || e.type == "group") {
          var i_child = e.childrens; // 子图层
          value.type = "group";
          value.objects = [];
          list[i] = value;
          return this.getSketchJson(i_child, res, value.objects);
        } else if (e.type == "FontCustom") {
          value.text = e.text;
          const { color, fontFamily, fontSize, letterSpacing, lineHeight, textAlign } = e.style;
          value.fill = color;
          value.fontFamily = fontFamily;
          value.fontSize = fontSize;
          if (letterSpacing) {
            value.charSpacing = letterSpacing;
          }
          if (lineHeight) {
            value.lineHeight = lineHeight;
          }
          value.textAlign = textAlign;
        } else if (e.type == "Image") {
          const base64 = this.image[e.image];
          if (!base64) {
            res();
            return;
          }
          //   value.src = this.image[e.image];
          var blob = this.dataURItoBlob(base64);
          this.slfileUpload(blob, e.name + ".png", base64).then((urlRes) => {
            // 子图层图片
            value.src = urlRes;
            // 图片返回图片url
            value.type = "image";
            list[i] = value;
            res(value);
          });
          return;
        } else {
          value.type = e.type;
        }
        if (list && Array.isArray(list)) {
          list[i] = value;
        }
        res(value);
      });
      outProArr.push(outPro);
    });
    if (resolve) {
      return Promise.all(outProArr)
        .then(resolve)
        .catch((err) => {
          console.log(err);
          resolve();
        });
    } else {
      return outProArr;
    }
  }
}

export default Sketch;
