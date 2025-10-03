// jsx/illustrator-helpers.jsx

// Helper function to extract XMP attribute values
$.global.extractXMPAttribute = function(xmpStr, tagName, attrName) {
    var pattern = new RegExp(tagName + '[^>]*' + attrName + '="([^"]+)"', 'i');
    var match = xmpStr.match(pattern);
    return match ? match[1] : null;
};

// Helper function to extract XMP tag values
$.global.extractXMPValue = function(xmpStr, tagName) {
    var pattern = new RegExp('<' + tagName + '>([^<]+)<\\/' + tagName + '>', 'i');
    var match = xmpStr.match(pattern);
    return match ? match[1] : null;
};

// Helper function to get document ID from XMP
$.global.getDocumentID = function(doc) {
    try {
        var xmpString = doc.XMPString;
        if (!xmpString) return null;
        
        return $.global.extractXMPAttribute(xmpString, 'xmpMM:DocumentID', 'rdf:resource') || 
               $.global.extractXMPValue(xmpString, 'xmpMM:DocumentID');
    } catch(e) {
        return null;
    }
};

// jsx/illustrator-helpers.jsx

// ... existing helper functions ...

// Helper function to create document info object
$.global.createDocumentInfo = function(doc, activeDoc) {
    return {
        id: $.global.getDocumentID(doc),
        name: doc.name,
        width: doc.width,
        height: doc.height,
        colorSpace: doc.documentColorSpace.toString(),
        numLayers: doc.layers.length,
        numArtboards: doc.artboards.length,
        saved: doc.saved,
        isActive: doc === activeDoc
    };
};


// Helper function to get detailed layer information
$.global.getLayerInfo = function(layer, includeSubLayers) {
    if (includeSubLayers === undefined) includeSubLayers = true;
    
    try {
        var layerInfo = {
            id: layer.absoluteZOrderPosition,
            name: layer.name,
            visible: layer.visible,
            locked: layer.locked,
            opacity: layer.opacity,
            printable: layer.printable,
            preview: layer.preview,
            sliced: layer.sliced,
            isIsolated: layer.isIsolated,
            hasSelectedArtwork: layer.hasSelectedArtwork,
            itemCount: layer.pageItems.length,
            zOrderPosition: layer.zOrderPosition,
            absoluteZOrderPosition: layer.absoluteZOrderPosition,
            dimPlacedImages: layer.dimPlacedImages,
            typename: layer.typename
        };
        
        // Get blending mode
        try {
            layerInfo.blendingMode = layer.blendingMode.toString();
        } catch(e) {
            layerInfo.blendingMode = "Normal";
        }
        
        // Get color info if available
        try {
            layerInfo.color = {
                red: layer.color.red,
                green: layer.color.green,
                blue: layer.color.blue
            };
        } catch(e) {
            layerInfo.color = null;
        }
        
        // Get artwork knockout state
        try {
            layerInfo.artworkKnockout = layer.artworkKnockout.toString();
        } catch(e) {
            layerInfo.artworkKnockout = "Inherited";
        }
        
        // Count different types of items on the layer
        try {
            layerInfo.itemCounts = {
                total: layer.pageItems.length,
                pathItems: layer.pathItems.length,
                textFrames: layer.textFrames.length,
                groupItems: layer.groupItems.length,
                compoundPathItems: layer.compoundPathItems.length,
                placedItems: layer.placedItems.length,
                rasterItems: layer.rasterItems.length,
                meshItems: layer.meshItems.length,
                symbolItems: layer.symbolItems.length
            };
        } catch(e) {
            layerInfo.itemCounts = { total: 0 };
        }
        
        // Handle sublayers
        layerInfo.subLayerCount = layer.layers.length;
        layerInfo.hasSubLayers = layer.layers.length > 0;
        
        if (includeSubLayers && layer.layers.length > 0) {
            layerInfo.subLayers = [];
            for (var j = 0; j < layer.layers.length; j++) {
                var subLayer = layer.layers[j];
                // Recursively get sublayer info (but don't go deeper to avoid infinite recursion)
                var subLayerInfo = $.global.getLayerInfo(subLayer, false);
                layerInfo.subLayers.push(subLayerInfo);
            }
        }
        
        return layerInfo;
    } catch(e) {
        return {
            error: "Error processing layer: " + e.toString(),
            layerName: layer.name || "Unknown"
        };
    }
};

// Helper function to get all layers information for a document
$.global.getAllLayersInfo = function(doc) {
    try {
        var layersInfo = [];
        
        for (var i = 0; i < doc.layers.length; i++) {
            var layer = doc.layers[i];
            var layerInfo = $.global.getLayerInfo(layer, true);
            layersInfo.push(layerInfo);
        }
        
        return {
            totalLayers: doc.layers.length,
            layers: layersInfo
        };
    } catch(e) {
        return {
            error: e.toString(),
            totalLayers: 0,
            layers: []
        };
    }
};

$.global.createDocumentInfo = function(doc, activeDoc) {
    var docInfo = {
        id: $.global.getDocumentID(doc),
        name: doc.name,
        width: doc.width,
        height: doc.height,
        colorSpace: doc.documentColorSpace.toString(),
        numLayers: doc.layers.length,
        numArtboards: doc.artboards.length,
        saved: doc.saved,
        isActive: doc === activeDoc
    };
    
    // Add layers information
    var layersResult = $.global.getAllLayersInfo(doc);
    docInfo.layers = layersResult.layers;
    docInfo.totalLayers = layersResult.totalLayers;
    
    return docInfo;
};