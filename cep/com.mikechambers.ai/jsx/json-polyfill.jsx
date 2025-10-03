// JSON polyfill for ExtendScript
// Minimal implementation for serializing simple objects and arrays

if (typeof JSON === 'undefined') {
    JSON = {};
}

if (typeof JSON.stringify === 'undefined') {
    JSON.stringify = function(obj) {
        var type = typeof obj;
        
        // Handle primitives
        if (obj === null) return 'null';
        if (obj === undefined) return 'undefined';
        if (type === 'number') {
            if (isNaN(obj)) return 'null';  // JSON spec: NaN becomes null
            if (!isFinite(obj)) return 'null';  // JSON spec: Infinity becomes null
            return String(obj);
        }
        if (type === 'boolean') return String(obj);
        if (type === 'string') {
            // Escape special characters
            var escaped = obj.replace(/\\/g, '\\\\')
                             .replace(/"/g, '\\"')
                             .replace(/\n/g, '\\n')
                             .replace(/\r/g, '\\r')
                             .replace(/\t/g, '\\t');
            return '"' + escaped + '"';
        }
        
        // Handle arrays
        if (obj instanceof Array) {
            var items = [];
            for (var i = 0; i < obj.length; i++) {
                items.push(JSON.stringify(obj[i]));
            }
            return '[' + items.join(',') + ']';
        }
        
        // Handle objects
        if (type === 'object') {
            var pairs = [];
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    pairs.push(JSON.stringify(key) + ':' + JSON.stringify(obj[key]));
                }
            }
            return '{' + pairs.join(',') + '}';
        }
        
        // Fallback
        return '{}';
    };
}