/*
 * TAL Framing — pure, DOM-free helpers for the protocol packet framing layer.
 *
 * SRS §3.3 / §3.5 and Issue #4. Exposed as `window.TALFraming` in the browser
 * and as a CommonJS module under Node so it can be unit tested without any
 * dependency. Keep this file free of `document`/`window` access.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TALFraming = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var HEX_RE = /^0x[0-9A-Fa-f]+$/;
    var ENDIANNESS = ['Big', 'Little'];
    var MAX_MARKER_BYTES = 16;

    function defaultFraming() {
        return {
            startMarker: { enabled: false, value: '' },
            endMarker: { enabled: false, value: '' },
            byteStuffing: { enabled: false, escapeByte: '0x7D', mask: '0x20' },
            padding: '0x00',
            endianness: '',
            maxPayloadSize: ''
        };
    }

    function asString(value, fallback) {
        if (value === undefined || value === null) {
            return fallback === undefined ? '' : fallback;
        }
        return String(value);
    }

    function normalize(framing) {
        var d = defaultFraming();
        var src = framing || {};
        var start = src.startMarker || {};
        var end = src.endMarker || {};
        var stuffing = src.byteStuffing || {};

        return {
            startMarker: {
                enabled: !!start.enabled,
                value: asString(start.value, d.startMarker.value)
            },
            endMarker: {
                enabled: !!end.enabled,
                value: asString(end.value, d.endMarker.value)
            },
            byteStuffing: {
                enabled: !!stuffing.enabled,
                escapeByte: asString(stuffing.escapeByte, d.byteStuffing.escapeByte),
                mask: asString(stuffing.mask, d.byteStuffing.mask)
            },
            padding: asString(src.padding, d.padding),
            endianness: asString(src.endianness, d.endianness),
            maxPayloadSize: asString(src.maxPayloadSize, d.maxPayloadSize)
        };
    }

    function isHex(value) {
        return typeof value === 'string' && HEX_RE.test(value);
    }

    function hexByteLength(value) {
        if (!isHex(value)) return 0;
        var digits = value.length - 2;
        if (digits === 0 || digits % 2 !== 0) return 0;
        return digits / 2;
    }

    function isPositiveIntegerString(value) {
        return /^[1-9][0-9]*$/.test(String(value));
    }

    function validateMarker(label, marker, errors) {
        if (!marker.enabled) return;
        if (!isHex(marker.value)) {
            errors.push(label + ' geçerli bir hex değeri olmalıdır (örn: 0xAA55).');
            return;
        }
        var bytes = hexByteLength(marker.value);
        if (bytes < 1 || bytes > MAX_MARKER_BYTES) {
            errors.push(label + ' 1 ile ' + MAX_MARKER_BYTES + ' byte arasında olmalıdır.');
        }
    }

    function validate(framing) {
        var f = normalize(framing);
        var errors = [];

        validateMarker('Start Marker', f.startMarker, errors);
        validateMarker('End Marker', f.endMarker, errors);

        if (f.byteStuffing.enabled) {
            if (hexByteLength(f.byteStuffing.escapeByte) !== 1) {
                errors.push('Escape Byte zorunludur ve tam 1 byte hex olmalıdır (örn: 0x7D).');
            }
            if (hexByteLength(f.byteStuffing.mask) !== 1) {
                errors.push('Stuffing Mask zorunludur ve tam 1 byte hex olmalıdır (örn: 0x20).');
            }
        }

        if (f.padding !== '' && hexByteLength(f.padding) !== 1) {
            errors.push('Padding tam 1 byte hex olmalıdır (örn: 0x00).');
        }

        if (ENDIANNESS.indexOf(f.endianness) === -1) {
            errors.push('Endianness seçilmelidir (Big veya Little).');
        }

        if (f.maxPayloadSize !== '' && !isPositiveIntegerString(f.maxPayloadSize)) {
            errors.push('Max Payload Size pozitif bir tamsayı olmalıdır.');
        }

        return errors;
    }

    function isValid(framing) {
        return validate(framing).length === 0;
    }

    function markerXml(tag, marker) {
        if (marker.enabled) {
            return '<' + tag + ' enabled="true"><Value>' + marker.value + '</Value></' + tag + '>';
        }
        return '<' + tag + ' enabled="false"/>';
    }

    function serialize(framing, indent) {
        var f = normalize(framing);
        var pad = indent === undefined ? '  ' : indent;
        var lines = [];

        lines.push('<Framing>');
        lines.push(pad + markerXml('StartMarker', f.startMarker));
        lines.push(pad + markerXml('EndMarker', f.endMarker));

        if (f.byteStuffing.enabled) {
            lines.push(pad + '<ByteStuffing enabled="true">' +
                '<EscapeByte>' + f.byteStuffing.escapeByte + '</EscapeByte>' +
                '<Mask>' + f.byteStuffing.mask + '</Mask>' +
                '</ByteStuffing>');
        } else {
            lines.push(pad + '<ByteStuffing enabled="false"/>');
        }

        if (f.padding !== '') {
            lines.push(pad + '<Padding>' + f.padding + '</Padding>');
        }

        lines.push(pad + '<Endianness>' + f.endianness + '</Endianness>');

        if (f.maxPayloadSize !== '') {
            lines.push(pad + '<MaxPayloadSize>' + f.maxPayloadSize + '</MaxPayloadSize>');
        }

        lines.push('</Framing>');
        return lines.join('\n');
    }

    function tagPattern(tag) {
        return new RegExp('<' + tag + '(?=[\\s/>])');
    }

    function getElement(xml, tag) {
        if (typeof xml !== 'string') return null;
        var match = tagPattern(tag).exec(xml);
        if (!match) return null;

        var start = match.index;
        var openEnd = xml.indexOf('>', start);
        if (openEnd === -1) return null;

        var selfClose = xml.charAt(openEnd - 1) === '/';
        var attrs = xml.slice(start + tag.length + 1, selfClose ? openEnd - 1 : openEnd);
        if (selfClose) return { attrs: attrs, inner: '' };

        var close = xml.indexOf('</' + tag + '>', openEnd);
        var inner = close === -1 ? '' : xml.slice(openEnd + 1, close);
        return { attrs: attrs, inner: inner };
    }

    function attrEnabled(element) {
        return element !== null && /enabled\s*=\s*["']?true["']?/i.test(element.attrs);
    }

    function childText(element, tag) {
        if (element === null) return null;
        var child = getElement(element.inner, tag);
        return child === null ? null : child.inner.trim();
    }

    function extractFraming(xml) {
        if (typeof xml !== 'string') return null;
        var open = tagPattern('Framing').exec(xml);
        if (!open) return null;

        var openEnd = xml.indexOf('>', open.index);
        if (openEnd === -1) return null;
        if (xml.charAt(openEnd - 1) === '/') return '';

        var close = xml.indexOf('</Framing>', openEnd);
        return close === -1 ? '' : xml.slice(openEnd + 1, close);
    }

    function parse(xml) {
        var f = defaultFraming();
        var fragment = extractFraming(xml);
        if (fragment === null) return f;

        var start = getElement(fragment, 'StartMarker');
        if (start !== null) {
            f.startMarker.enabled = attrEnabled(start);
            if (f.startMarker.enabled) f.startMarker.value = childText(start, 'Value') || '';
        }

        var end = getElement(fragment, 'EndMarker');
        if (end !== null) {
            f.endMarker.enabled = attrEnabled(end);
            if (f.endMarker.enabled) f.endMarker.value = childText(end, 'Value') || '';
        }

        var stuffing = getElement(fragment, 'ByteStuffing');
        if (stuffing !== null) {
            f.byteStuffing.enabled = attrEnabled(stuffing);
            if (f.byteStuffing.enabled) {
                f.byteStuffing.escapeByte = childText(stuffing, 'EscapeByte') || '';
                f.byteStuffing.mask = childText(stuffing, 'Mask') || '';
            }
        }

        var padding = getElement(fragment, 'Padding');
        if (padding !== null) f.padding = padding.inner.trim();

        var endianness = getElement(fragment, 'Endianness');
        if (endianness !== null) f.endianness = endianness.inner.trim();

        var maxPayload = getElement(fragment, 'MaxPayloadSize');
        if (maxPayload !== null) f.maxPayloadSize = maxPayload.inner.trim();

        return normalize(f);
    }

    function markerByteSize(marker) {
        return marker.enabled ? hexByteLength(marker.value) : 0;
    }

    return {
        MAX_MARKER_BYTES: MAX_MARKER_BYTES,
        defaultFraming: defaultFraming,
        normalize: normalize,
        isHex: isHex,
        hexByteLength: hexByteLength,
        isPositiveIntegerString: isPositiveIntegerString,
        validate: validate,
        isValid: isValid,
        serialize: serialize,
        parse: parse,
        markerByteSize: markerByteSize
    };
}));
