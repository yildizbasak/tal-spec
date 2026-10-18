# TAL Data Model

Bu doküman, TAL protokol tanımının XML veri modelini açıklar. Şema: `docs/schema/tal.xsd`.

## Kök Yapı

Her TAL dosyası tek bir `<TAL>` kökü ile başlar ve `schemaVersion` attribute'u taşır.

```xml
<TAL schemaVersion="1.0">
  <Metadata>...</Metadata>
  <Protocols>...</Protocols>
  <Sides>...</Sides>
  <Enums>...</Enums>
  <Structs>...</Structs>
  <Messages>...</Messages>
</TAL>
```

| Element | Zorunlu | Açıklama |
| --- | --- | --- |
| Metadata | Evet | Proje adı, versiyon, açıklama |
| Protocols | Hayır | Protokol tanımları (framing, header, integrity, addressing) |
| Sides | Hayır | Haberleşme tarafları |
| Enums | Hayır | Yeniden kullanılabilir enum tanımları |
| Structs | Hayır | Yeniden kullanılabilir veri yapıları |
| Messages | Hayır | Mesaj tanımları |

## Metadata

```xml
<Metadata>
  <Name>MotorControl</Name>
  <Version major="1" minor="0" patch="0"/>
  <Description>...</Description>
  <Author>...</Author>
  <CreatedAt>2026-10-18T10:00:00Z</CreatedAt>
  <LastModifiedAt>2026-10-18T14:30:00Z</LastModifiedAt>
</Metadata>
```

| Element | Zorunlu | Tip | Açıklama |
| --- | --- | --- | --- |
| Name | Evet | string | Proje adı |
| Version | Evet | object | SemVer (major.minor.patch) |
| Description | Hayır | string | Açıklama |
| Author | Hayır | string | Yazar |
| CreatedAt | Hayır | dateTime | Oluşturulma zamanı |
| LastModifiedAt | Hayır | dateTime | Son değişiklik zamanı |

## Protocols

Her protokol, mesajların nasıl çerçeveleneceğini belirler.

```xml
<Protocols>
  <Protocol id="uuid" name="MainProtocol">
    <Description>...</Description>
    <Framing>...</Framing>
    <Header>...</Header>
    <Integrity>...</Integrity>
    <Addressing>...</Addressing>
  </Protocol>
</Protocols>
```

### Framing

Mesajın başını/sonunu ve bit dizilimini belirler.

| Element | Zorunlu | Açıklama |
| --- | --- | --- |
| StartMarker | Evet | Başlangıç bayrağı (`enabled` + opsiyonel `Value` hex) |
| EndMarker | Evet | Bitiş bayrağı (`enabled` + opsiyonel `Value` hex) |
| ByteStuffing | Evet | Kaçış baytı (`enabled` + `EscapeByte` + `Mask`) |
| Padding | Hayır | Boş alan dolgusu (hex) |
| Endianness | Evet | `Big` veya `Little` |
| MaxPayloadSize | Hayır | Maksimum payload boyutu (pozitif tamsayı) |

### Header

Sıralı `<Field>` ve `<Spare>` listesi. Her field bir `role` taşıyabilir.

**Roller:**

| Role | Zorunlu | Açıklama |
| --- | --- | --- |
| sync | Hayır | Senkronizasyon baytı |
| sender | Evet | Gönderen birim adresi |
| destination | Evet | Alıcı birim adresi |
| broadcast | Hayır | Broadcast bayrağı |
| messageId | Evet | Mesaj tipi kimlik numarası (statik) |
| messageType | Evet | Komut/Yanıt/Veri vb. |
| payloadSize | Evet | Payload boyutu |
| protocolVersion | Evet | Protokol versiyonu |
| sequenceNumber | Hayır | İşlem sıra numarası (dinamik) |
| priority | Hayır | Öncelik |
| timestamp | Hayır | Zaman damgası |

### Integrity

Bütünlük doğrulama ayarları.

| Element | Zorunlu | Değerler |
| --- | --- | --- |
| Scope | Evet | `Payload` / `HeaderAndPayload` |
| Position | Evet | `afterHeader` / `afterPayload` |
| Algorithm/Type | Evet | `crc` / `checksum` / `custom` |
| Algorithm/Bits | Koşullu | crc için zorunlu (8/16/32) |
| Algorithm/Polynomial | Hayır | CRC polinomu |
| Algorithm/InitValue | Hayır | CRC başlangıç değeri |
| Algorithm/XorOut | Hayır | CRC çıkış XOR değeri |
| Algorithm/Name | Koşullu | custom için zorunlu |
| Algorithm/Expression | Koşullu | custom için zorunlu |

### Addressing

| Element | Zorunlu | Açıklama |
|---|---|---|
| BroadcastId | Hayır | Tüm cihazların dinlediği adres (hex) |

## Sides

Haberleşen taraflar.

```xml
<Side id="uuid" name="WindowsPC">
  <Type>master</Type>
  <Address>0x00</Address>
</Side>
```

| Element | Zorunlu | Değerler |
| --- | --- | --- |
| Type | Evet | `master` / `slave` / `device` |
| Address | Evet | Hex adres |
| Description | Hayır | Açıklama |

## Enums

Yeniden kullanılabilir sabit değer listeleri.

```xml
<Enum id="uuid" name="MotorDirection" size="8">
  <Value name="FORWARD" value="0"/>
  <Value name="BACKWARD" value="1"/>
</Enum>
```

| Attribute | Zorunlu | Açıklama |
| --- | --- | --- |
| id | Evet | UUID |
| name | Evet | Enum adı |
| size | Evet | 8, 16 veya 32 (bit) |

**Kural:** Değerler `size` sınırını aşamaz (u8 → 255, u16 → 65535, u32 → 4294967295). Parser kontrol eder.

## Structs

Yeniden kullanılabilir veri yapıları.

```xml
<Struct id="uuid" name="MotorCommand">
  <Field id="uuid" name="speed"     type="u16"  size="16"/>
  <Field id="uuid" name="direction" type="enum" ref="uuid" size="8"/>
  <Spare size="8"/>
</Struct>
```

**Field tipleri:** `u8`, `u16`, `u32`, `u64`, `i8`, `i16`, `i32`, `i64`, `bool`, `enum`, `struct`.

- `type="enum"` veya `type="struct"` ise `ref` zorunlu.
- `size` her zaman **bit** cinsinden.
- Toplam bit sayısı 8'in katı değilse `<Spare>` otomatik eklenir (parser kontrolü).

**Dinamik alanlar:**

- `isDynamic="true"` + `countFieldRef="uuid"` → başka bir alan sayaç olarak bağlanır.
- `isAutoSizeIndicator="true"` + `autoIndicatorFor="uuid"` → otomatik üretilen sayaç alanı.

## Messages

Yön, ID, payload ve yanıt ilişkisini tanımlar.

```xml
<Message id="uuid" name="StartMotor">
  <Source      ref="side-uuid"/>
  <Destination ref="side-uuid"/>
  <MessageId>0x01</MessageId>
  <Protocol    ref="proto-uuid"/>
  <Payload     ref="struct-uuid"/>
  <Response    ref="msg-uuid"/>
</Message>
```

| Element | Zorunlu | Açıklama |
| --- | --- | --- |
| Source | Evet | Gönderici taraf |
| Destination | Evet | Alıcı taraf |
| MessageId | Evet | Mesaj tip kimliği (hex, statik) |
| Protocol | Evet | Hangi protokolün kuralları uygulanır |
| Payload | Hayır | Payload struct'ı (yoksa payload'sız) |
| Response | Hayır | Yanıt mesajı (yoksa fire-and-forget) |

**Kurallar (parser kontrolü):**

- Message ID tekilliği **yön bazlıdır**: `(Source, Destination)` çifti için unique.
- A → B → A response döngüsüne izin verilir (uyarı gösterilir, engellenmez).
- Struct döngüsü (A → B → A) engellenir.
- Kullanımda olan bir Side/Enum/Struct/Message silinemez.

## UUID Kullanımı

Tüm `id` ve `ref` attribute'ları UUID formatındadır:

```
[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}
```

UUID'ler değişmez; isimler (`name`) değişse bile referanslar kırılmaz.

## Versiyonlama

İki seviye:

1. **`schemaVersion`** (TAL kök attribute): XML şemasının versiyonu. Şema değişince artar.
2. **`Metadata/Version`**: Kullanıcının mesaj seti versiyonu (SemVer). SRS §1.4 kuralları geçerli.
