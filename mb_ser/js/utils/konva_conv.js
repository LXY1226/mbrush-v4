/*
 * Copyright (c) 2019, Kudo, Inc.
 * All rights reserved.
 *
 * Author: Duke Fong <d@d-l.io>
 */

import { gen_code_img, load_img, sha1, cpy } from './helper.js';
import { L } from '../utils/lang.js'


async function update_item(kobj) {
    let text_result = '';
    if (kobj.attrs.text_src && kobj.attrs.text_src != '') {
        try {
            text_result = Function("return `" + kobj.attrs.text_src + "`;")();
        } catch {
            text_result = kobj.attrs.text_src;
        }
    }
    
    if (kobj.getClassName() == 'Image' && text_result != '') {
        if (kobj.attrs.text_result) {
            if (text_result == kobj.attrs.text_result)
                return;
        }
        kobj.attrs.text_result = text_result;
        let img = await gen_code_img(kobj.attrs.code_type, text_result, kobj.attrs.code_color,
                                     typeof(code_cfg) !== 'undefined' ? code_cfg : {});
        //console.log('update svg url:', img.src);
        kobj.image(img);
    } else if (kobj.getClassName() == 'Text') {
        kobj.text(text_result);
    }
}

async function update_group(kobj) {
    for (let i of kobj) {
        //console.log(i.getClassName());
        if (i.getClassName() == 'Group') {
            await update_group(i.children);
        } else {
            await update_item(i);
        }
    }
}

async function konva_update(kobj) {
    await update_group(kobj.children);
}


async function d_add_item(kobj, dobj, files) {
    if (kobj.getClassName() == 'Image') {
        dobj['type'] = 'img';
        cpy(dobj['attrs'], kobj.attrs, ['x', 'y', 'rotation', 'opacity', 'text_src', 'code_color', 'code_type'], {
            'width': 'w',
            'height': 'h',
            'scaleX': 'scale_x',
            'scaleY': 'scale_y',
            'shadowBlur': 'shadow_blur',
            'shadowColor': 'shadow_color',
            'shadowOffsetX': 'shadow_x',
            'shadowOffsetY': 'shadow_y',
            'shadowOpacity': 'shadow_opacity'
        });
        const img = await fetch(kobj.attrs.image.src);
        const img_blob = await img.blob();
        const img_buf = await new Response(img_blob).arrayBuffer();
        const dat = new Uint8Array(img_buf);
        const hash = await sha1(dat);
        if (!(hash in files))
            files[hash] = {'type': img_blob.type, 'data': dat};
        dobj['attrs']['hash'] = hash;
    } else if (kobj.getClassName() == 'Text') {
        dobj['type'] = 'text';
        cpy(dobj['attrs'], kobj.attrs, ['x', 'y', 'text', 'align', 'rotation', 'opacity', 'text_src'], {
            'fill': 'color',
            'fontFamily': 'font_family',
            'fontSize': 'font_size',
            'fontStyle': 'font_style',
            'scaleX': 'scale_x',
            'scaleY': 'scale_y',
            'shadowBlur': 'shadow_blur',
            'shadowColor': 'shadow_color',
            'shadowOffsetX': 'shadow_x',
            'shadowOffsetY': 'shadow_y',
            'shadowOpacity': 'shadow_opacity'
        });
    } else if (kobj.getClassName() == 'Rect') {
        dobj['type'] = 'rect';
    }
}

async function d_add_group(kobj, dobj, files) {
    for (let i of kobj) {
        //console.log(i.getClassName());
        if (i.getClassName() == 'Group') {
            let a = {'type': 'group', 'sub': [], 'attrs': {}};
            cpy(a['attrs'], i.attrs, ['x', 'y', 'opacity'], {'rotation': 'r'});
            await d_add_group(i.children, a['sub'], files);
            if (a['sub'].length)
                dobj.push(a);
        } else {
            let p = {'attrs': {}};
            await d_add_item(i, p, files);
            if ('type' in p)
                dobj.push(p);
        }
    }
}

async function konva2d(kobj) {
    let d = { 'files': {}, 'sub': [] };
    await d_add_group(kobj.children, d['sub'], d['files']);
    return d;
}


async function k_add_item(kobj, dobj, files) {
    if (dobj.type == 'img') {
        let f = files[dobj['attrs']['hash']];
        let img_blob = new Blob([f['data']], {type: f['type']});
        let src = URL.createObjectURL(img_blob);
        let img = new Image();
        let ret = await load_img(img, src);
        if (ret != 0)
            return;
        let a = {image: img};
        cpy(a, dobj.attrs, ['x', 'y', 'rotation', 'opacity', 'text_src', 'code_color', 'code_type'], {
            'w': 'width',
            'h': 'height',
            'scale_x': 'scaleX',
            'scale_y': 'scaleY',
            'shadow_blur': 'shadowBlur',
            'shadow_color': 'shadowColor',
            'shadow_x': 'shadowOffsetX',
            'shadow_y': 'shadowOffsetY',
            'shadow_opacity': 'shadowOpacity'
        });
        let p = new Konva.Image(a);
        kobj.add(p);

    } else if (dobj.type == 'text') {
        let a = {};
        if (!('text_src' in dobj.attrs))
            dobj.attrs.text_src = dobj.attrs.text;
        cpy(a, dobj.attrs, ['x', 'y', 'text', 'align', 'rotation', 'opacity', 'text_src'], {
            'color': 'fill',
            'font_family': 'fontFamily',
            'font_size': 'fontSize',
            'font_style': 'fontStyle',
            'scale_x': 'scaleX',
            'scale_y': 'scaleY',
            'shadow_blur': 'shadowBlur',
            'shadow_color': 'shadowColor',
            'shadow_x': 'shadowOffsetX',
            'shadow_y': 'shadowOffsetY',
            'shadow_opacity': 'shadowOpacity'
        });
        a.text = Function("return `" + a.text + "`;")();
        let t = new Konva.Text(a);
        kobj.add(t);
    
    } else if (dobj.type == 'rect') {
        console.log('skip rect');
    
    }
}

async function k_add_group(kobj, dobj, files) {
    for (let i of dobj) {
        if (i.type == 'group') {
            let a = {};
            cpy(a, i.attrs, ['x', 'y', 'opacity'], {'r': 'rotation'});
            var group = new Konva.Group(a);
            await k_add_group(group, i['sub'], files);
            kobj.add(group);
        } else {
            await k_add_item(kobj, i, files);
        }
    }
}

async function d2konva(kobj, dobj) {
    await k_add_group(kobj, dobj['sub'], dobj['files']);
    kobj.draw();
    //kobj.batchDraw();
}


export { konva_update, konva2d, d2konva };
