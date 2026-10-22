export type XNode = {
  name: string;
  attrs: Record<string, string>;
  children: XNode[];
  text: string;
};

const TOKEN =
  /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/gi;
const ATTR = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return NAMED[body.toLowerCase()] ?? m;
  });
}

const local = (name: string) => name.slice(name.indexOf(":") + 1);

function parseAttrs(src: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of src.matchAll(ATTR)) {
    const value = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
    attrs[m[1]] = value;
    const short = local(m[1]);
    if (short !== m[1] && !(short in attrs)) attrs[short] = value;
  }
  return attrs;
}

export function parseXml(src: string): XNode {
  const root: XNode = { name: "#root", attrs: {}, children: [], text: "" };
  const stack: XNode[] = [root];
  for (const m of src.replace(/^﻿/, "").matchAll(TOKEN)) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.text += m[1];
    else if (m[2] !== undefined) {
      const name = local(m[2]);
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].name === name) {
          stack.length = i;
          break;
        }
      }
    } else if (m[3] !== undefined) {
      const node: XNode = {
        name: local(m[3]),
        attrs: parseAttrs(m[4] ?? ""),
        children: [],
        text: "",
      };
      top.children.push(node);
      if (m[5] !== "/") stack.push(node);
    } else if (m[6] !== undefined) top.text += decodeEntities(m[6]);
  }
  return root.children[0] ?? root;
}

export function findAll(node: XNode, name: string, out: XNode[] = []): XNode[] {
  for (const child of node.children) {
    if (child.name === name) out.push(child);
    findAll(child, name, out);
  }
  return out;
}

export function find(node: XNode, name: string): XNode | null {
  for (const child of node.children) {
    if (child.name === name) return child;
    const hit = find(child, name);
    if (hit) return hit;
  }
  return null;
}

export function textOf(node: XNode): string {
  let out = node.text;
  for (const child of node.children) out += textOf(child);
  return out.replace(/\s+/g, " ").trim();
}
