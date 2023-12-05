import styleParser from "./styleParser";
import pathParser from "./pathParser";
let index = 0;
import util from "./utils";
const nameStore = [];
const rename = function (name) {
  let index = 1;
  let nextName = name;

  while (nameStore.indexOf(nextName) !== -1) {
    nextName = name + "_" + index++;
  }
  return nextName;
};
const handleItem = function (item) {
  let result = {};
  result.id = item.do_objectID;
  result.frame = item.frame || {};
  result.style = styleParser(item.style, item.attributedString, item);
  result.path = pathParser(item);
  result.isVisible = item.isVisible;
  if (item.hasBackgroundColors) {
    result.backgroundColor = util.color(item.backgroundColor);
  }
  let name = item.name ? item.name : "未命名";
  name = name.replace(/^([^a-z_A-Z])/, "_$1").replace(/[^a-z_A-Z0-9-]/g, "_");
  result.name = rename(name);
  nameStore.push(result.name);
  if (item._class === "oval") {
    result.isCircle = util.isCircle(item);
    if (result.isCircle) {
      const p1 = util.toPoint(item.path.points[0].point, item);
      const p2 = util.toPoint(item.path.points[1].point, item);
      const p3 = util.toPoint(item.path.points[2].point, item);
      const p4 = util.toPoint(item.path.points[3].point, item);
      result.style.borderRadius = (p1.y - p3.y) / 2;
    }
  }
  result.isMask = !!item.hasClippingMask;
  if (item._class === "rectangle") {
    item._class = "rect";
    result.isRect = util.isRect(item);
  }
  if (item._class === "text") {
    item._class = "FontCustom";
    result.text = result.style.text || item.name;
  }
  if (item._class === "bitmap") {
    item._class = "Image";
    result.image = item.image._ref;
  }
  if (item._class === "artboard") {
    result.frame.x = null;
    result.frame.y = null;
  }
  if (item.symbolID) {
    result.symbolID = item.symbolID;
  }
  result.type = item._class;

  return result;
};

const layerParser = function (item) {
  index++;
  if (index >= 15000) {
    throw new Error("太多了");
  }
  let element = {};
  element = handleItem(item);
  if (item.layers) {
    element.childrens = [];
    item.layers.forEach((_item) => {
      let r = layerParser(_item);
      if (r) {
        element.childrens.push(r);
      }
    });
  }
  return element;
};

export default layerParser;
