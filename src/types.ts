/**
 * types.ts
 *
 * Supported CUGL types in Figma
 *
 * Currently we have types the following nodes from scene2 in CUGL: Node, Image,
 * Poly, Path, Wire, Sprite, NinePatch, Label, Button, Slider, and
 * Textfield.  However, not all of the these types are currently supported.
 * Set the "generate" package for the list of supported types.
 *
 * Authors: Walker White, Enoch Chen, Skyler Krouse, Aidan Campbell
 * Date: 1/24/24
 */

// Whether to export as a scenegraph node or a widget.
export type OutputFormat = "node" | "widget";


// (x,y) coordinates as a type
type CUGLXY = [number, number];
// A rectangle as left-bottom-right-top
type CUGLLBRT = [number, number, number, number];
// A rectangle as (x,y)-(w,h)
//type CUGLXYWH = [number, number, number, number];
// A numeric range
//type CUGLMinMax = [number, number];
// An RGBA color as a numeric value
export type CUGLRGBA = [number, number, number, number];


/**
 * The (potentially) supported CUGL nodes
 */
type CUGLNodeType =
    | CUGLBaseNode
    | CUGLButtonNode
    | CUGLSliderNode
    | CUGLLabelNode
    | CUGLTextFieldNode
    | CUGLImageNode
    | CUGLNinePatchNode
    | CUGLRectNode
    | CUGLPolyNode
    | CUGLPathNode

/**
 * The data component of a standard node.
 */
type Data = {
    position?: CUGLXY;
    size?: CUGLXY;
    anchor?: CUGLXY;
    scale?: number | CUGLXY;
    angle?: number; 
    visible?: boolean;
};


/**
 * A Polygon representation
 */
type Poly = {
    vertices?: number[];
    indices?: number[];
};


/**
 * A path representation
 */
type Path = {
    vertices?: number[];
    indices?: number[];
    closed?: boolean;
};


/** 
 * The base scene graph node
 */
export type CUGLBaseNode = {
    type: "Node";
    data: Data;
};


/**
 * An image node
 */
export type CUGLImageNode = {
    type: "Image";
    data: Data & {
        texture: string;
    };
};


/**
 * A button node
 */
export type CUGLButtonNode = {
    type: "Button";
    data: Data & {
        upnode: string;
        downnode?: string | CUGLRGBA;
    };
};

export type CUGLSliderNode = {
    type: "Slider";
    data: Data & {
        bounds: number[];
        range?: number[];
        value?: number;
        tick?: number;
        snap?: boolean;
        knob?: string;
        path?: string;
    }
}


/**
 * A text label node
 */
export type CUGLLabelNode = {
    type: "Label";
    data: Data & {
        font: string;
        text: string;
        foreground?: CUGLRGBA | string;
        background?: CUGLRGBA | string;
        padding?: CUGLLBRT;
        halign?:
            | "left"
            | "center"
            | "right"
            | "hard left"
            | "true center"
            | "hard right";
        valign?:
            | "top"
            | "middle"
            | "bottom"
            | "hard top"
            | "true middle"
            | "hard bottom";
    };
};


/**
 * An editable text field node
 */
export type CUGLTextFieldNode = {
    type: "TextField";
    data: Data & {
        font: string;
        text: string;
        foreground?: CUGLRGBA | string;
        background?: CUGLRGBA | string;
        padding?: CUGLLBRT;
        halign?:
            | "left"
            | "center"
            | "right"
            | "hard left"
            | "true center"
            | "hard right";
        valign?:
            | "top"
            | "middle"
            | "bottom"
            | "hard top"
            | "true middle"
            | "hard bottom";
        cursor?: boolean;
        cursorcolor?: CUGLRGBA | string;
        cursorwidth?: number;
    };
};


/**
 * A rectangle node
 */
export type CUGLRectNode = {
    type: "Solid";
    data: Data & {
        color?: CUGLRGBA | string;
    };
};

/**
 * A polygon node
 * 
 * Currently, this only supports solid colored shapes.
 */
export type CUGLPolyNode = {
    type: "Solid";
    data: Data & {
        polygon?: number[] | Poly;
        color?: CUGLRGBA | string;
    };
    layout?: {
        x_offset?: number;
        y_offset?: number;
        absolute?: boolean;
        x_anchor?: "left" | "center" | "right" | "fill";
        y_anchor?: "bottom" | "middle" | "top" | "fill";
    };
};


/**
 * A path node
 * 
 * Currently, this only supports solid colored shapes.
 */
export type CUGLPathNode = {
    type: "Path";
    data: Data & {
        path?: number[] | Path;
        color?: CUGLRGBA | string;
        stroke?: number;
        joint?: string;
        endcap?: string;
    };
};

/**
 * A nine patch node
 */
export type CUGLNinePatchNode = {
    type: "NinePatch";
    data: Data & {
        texture: string;
        interior: number[];
    };
};


export type CUGLFormatType = {
    type: "FigmaAnchored" | "Float";
    orientation?: "horizontal" | "vertical";
    x_alignment?: "left" | "center" | "right";
    y_alignment?: "bottom" | "middle" | "top";
}


/**
 * Layout information for an anchor layout
 */
export type CUGLAnchoredLayoutMixin = {
    format: CUGLFormatType;
    children: {
        [key: string]: {
            layout: {
                x_offset?: number;
                y_offset?: number;
                absolute?: boolean;
                x_anchor?: "left" | "center" | "right" | "fill";
                y_anchor?: "bottom" | "middle" | "top" | "fill";
            };
        };
    };
};


/**
 * Layout information for a float layout
 */
export type CUGLFloatLayoutMixin = {
    format: CUGLFormatType;
    children: {
        [key: string]: {
            layout: {
                priority: number;
                padding?: CUGLLBRT
            };
        };
    };
};


/**
 * A type for supported layouts
 *
 * Figma only supports anchor and float layout
 */
export type CUGLLayoutMixin = {} | CUGLAnchoredLayoutMixin | CUGLFloatLayoutMixin;


/**
 * The child dictionary of a CUGL node
 */
export type CUGLChildrenMixin = {
    children?: { [key: string]: CUGLNode };
};


/**
 * The structure of a CUGL node
 *
 * This includes a mixin for the layout and the children
 */
export type CUGLNode = CUGLNodeType & CUGLChildrenMixin & CUGLLayoutMixin;

/**
 * The structure of a Widget
 *
 * This is just a CUGL node with a blank variables section
 */
export type CUGLWidget = {
    variables: {
        [key: string]: string[];
    };
    contents: CUGLNode;
};
