'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const Framing = require('../framing.js');

function byteString(count, fill) {
    return '0x' + (fill || 'AA').repeat(count);
}

test('varsayılan framing endianness seçilmemiştir ve geçersizdir', () => {
    const def = Framing.defaultFraming();
    assert.equal(def.endianness, '');
    assert.ok(Framing.validate(def).some(e => e.indexOf('Endianness') !== -1));

    const fixed = Framing.normalize(Object.assign({}, def, { endianness: 'Big' }));
    assert.deepEqual(Framing.validate(fixed), []);
});

test('serialize/parse round-trip tüm alanları korur', () => {
    const original = {
        startMarker: { enabled: true, value: '0xAA55' },
        endMarker: { enabled: true, value: '0xFF00' },
        byteStuffing: { enabled: true, escapeByte: '0x10', mask: '0x20' },
        padding: '0xFF',
        endianness: 'Little',
        maxPayloadSize: '256'
    };

    const xml = Framing.serialize(original, '    ');
    const parsed = Framing.parse(xml);

    assert.deepEqual(parsed, Framing.normalize(original));
    assert.ok(xml.indexOf('<Endianness>Little</Endianness>') !== -1);
    assert.ok(xml.indexOf('<MaxPayloadSize>256</MaxPayloadSize>') !== -1);
});

test('her alan ayrı bir element olarak serialize edilir', () => {
    const xml = Framing.serialize({
        startMarker: { enabled: true, value: '0xAA55' },
        endMarker: { enabled: false, value: '' },
        byteStuffing: { enabled: true, escapeByte: '0x7D', mask: '0x20' },
        padding: '0x00',
        endianness: 'Big',
        maxPayloadSize: '64'
    }, '  ');

    ['<StartMarker', '<EndMarker', '<ByteStuffing', '<Padding>', '<Endianness>', '<MaxPayloadSize>']
        .forEach(tag => assert.ok(xml.indexOf(tag) !== -1, 'eksik element: ' + tag));
});

test('disabled marker XML çıktısında <Value> elementi içermez', () => {
    const xml = Framing.serialize({
        startMarker: { enabled: false, value: '0xAA55' },
        endMarker: { enabled: false, value: '0xFF00' },
        byteStuffing: { enabled: false, escapeByte: '0x7D', mask: '0x20' },
        padding: '0x00',
        endianness: 'Big',
        maxPayloadSize: ''
    }, '  ');

    assert.ok(xml.indexOf('<StartMarker enabled="false"/>') !== -1);
    assert.ok(xml.indexOf('<EndMarker enabled="false"/>') !== -1);
    assert.equal(xml.indexOf('<Value>'), -1);
});

test('byte stuffing kapalıyken escape/mask alanları yok sayılır', () => {
    const errors = Framing.validate({
        byteStuffing: { enabled: false, escapeByte: '', mask: '' },
        endianness: 'Big'
    });
    assert.deepEqual(errors, []);

    const xml = Framing.serialize({
        byteStuffing: { enabled: false, escapeByte: '', mask: '' },
        endianness: 'Big'
    });
    assert.ok(xml.indexOf('<ByteStuffing enabled="false"/>') !== -1);
});

test('byte stuffing açıkken escape ve mask zorunludur', () => {
    const errors = Framing.validate({
        byteStuffing: { enabled: true, escapeByte: '', mask: '' },
        endianness: 'Big'
    });
    assert.ok(errors.some(e => e.indexOf('Escape Byte') !== -1));
    assert.ok(errors.some(e => e.indexOf('Stuffing Mask') !== -1));
});

test('marker sınır değerleri: 16 byte geçerli, 17 byte ve geçersiz karakter reddedilir', () => {
    const at16 = Framing.validate({
        startMarker: { enabled: true, value: byteString(16) },
        endianness: 'Big'
    });
    assert.deepEqual(at16, []);

    const at17 = Framing.validate({
        startMarker: { enabled: true, value: byteString(17) },
        endianness: 'Big'
    });
    assert.ok(at17.some(e => e.indexOf('1 ile 16 byte') !== -1));

    const invalid = Framing.validate({
        startMarker: { enabled: true, value: '0xZZ' },
        endianness: 'Big'
    });
    assert.ok(invalid.some(e => e.indexOf('geçerli bir hex') !== -1));
});

test('boş (0 byte) marker aktifken geçersizdir', () => {
    const errors = Framing.validate({
        endMarker: { enabled: true, value: '' },
        endianness: 'Big'
    });
    assert.ok(errors.some(e => e.indexOf('End Marker') !== -1));
});

test('max payload size pozitif tamsayı olmalı; 0 ve negatif reddedilir', () => {
    assert.deepEqual(Framing.validate({ endianness: 'Big', maxPayloadSize: '1' }), []);
    assert.ok(Framing.validate({ endianness: 'Big', maxPayloadSize: '0' }).length > 0);
    assert.ok(Framing.validate({ endianness: 'Big', maxPayloadSize: '-5' }).length > 0);
    assert.ok(Framing.validate({ endianness: 'Big', maxPayloadSize: '12.5' }).length > 0);
});

test('padding tam 1 byte olmalıdır', () => {
    assert.deepEqual(Framing.validate({ endianness: 'Big', padding: '0x00' }), []);
    assert.ok(Framing.validate({ endianness: 'Big', padding: '0xAABB' }).length > 0);
    assert.ok(Framing.validate({ endianness: 'Big', padding: 'nope' }).length > 0);
});

test('parse Framing elementi yoksa varsayılanları döndürür', () => {
    const parsed = Framing.parse('<TAL_Protocol><Protocol/></TAL_Protocol>');
    assert.deepEqual(parsed, Framing.defaultFraming());
});

test('parse attribute sırası ve boşluklardan bağımsızdır', () => {
    const xml = [
        '<Protocol>',
        '  <Framing>',
        '    <StartMarker   enabled = "true" ><Value> 0x7E </Value></StartMarker>',
        '    <EndMarker enabled="false"/>',
        '    <ByteStuffing enabled="true"><EscapeByte>0x10</EscapeByte><Mask>0x20</Mask></ByteStuffing>',
        '    <Padding>0x00</Padding>',
        '    <Endianness>Big</Endianness>',
        '  </Framing>',
        '</Protocol>'
    ].join('\n');

    const parsed = Framing.parse(xml);
    assert.deepEqual(parsed.startMarker, { enabled: true, value: '0x7E' });
    assert.deepEqual(parsed.endMarker, { enabled: false, value: '' });
    assert.deepEqual(parsed.byteStuffing, { enabled: true, escapeByte: '0x10', mask: '0x20' });
    assert.equal(parsed.endianness, 'Big');
});

test('hexByteLength tek haneli veya geçersiz değerler için 0 döndürür', () => {
    assert.equal(Framing.hexByteLength('0xAA55'), 2);
    assert.equal(Framing.hexByteLength('0xA'), 0);
    assert.equal(Framing.hexByteLength('AA55'), 0);
    assert.equal(Framing.hexByteLength(''), 0);
});
