# Transport Abstraction Layer (TAL) — Software Requirements Specification (SRS v1.7)

## 1. Sistem Mimarisi ve Veri Depolama (System Architecture & Data Management)

* **1.1. İstemci Taraflı Veri Yönetimi (Client-Side State Management):**
  * Uygulama tamamen istemci taraflı (Frontend-Only Single Page Application) çalışacaktır. Sunucu veya veritabanı bağımlılığı bulunmayacaktır.
  * Tüm sistem konfigürasyonu, veri tipleri, mesajlar ve protokoller uygulama belleğinde (State) tutulacak ve yerel dosyalar aracılığıyla yönetilecektir.

* **1.2. XML İçe/Dışa Aktarım (XML Import / Export):**
  * Uygulama, geçerli bir TAL XML dosyasını ayrıştırarak (parse) tüm veri ağacını yükleyebilmelidir (Import).
  * Oluşturulan tüm tanımlamalar, veri kaybı olmaksızın standart bir XML şemasına dönüştürülerek dışa aktarılabilmelidir (Export).

* **1.3. İnteraktif Standalone HTML Dokümantasyon Üreteci:**
  * Uygulama, tanımlanan tüm veri kümesini tek bir HTML dosyası (`Single File Standalone HTML`) olarak dışa aktarabilmelidir.
  * Üretilen HTML dosyası dış CSS/JS bağımlılığı taşımayacak, çift tıkla herhangi bir tarayıcıda çalışabilecektir.
  * Doküman içeriğinde canlı arama/filtreleme (`Message ID`, `Side`, `Struct` ismi veya `Enum` değeri arama), katlanabilir (collapsible) nested struct ağacı, Komut-Yanıt ilişki haritası ve fare ile üzerine gelindiğinde (hover) bit/byte offset detayı gösteren dinamik paket haritası yer alacaktır.

* **1.4. Şema Versiyonlama ve Anlamsal Sürüm Kontrolü (SemVer):**
  * Her mesaj seti `Major.Minor.Patch` yapısı ile izlenecektir.
  * **Major Artışı (Breaking Changes):** Var olan bir Struct'a yeni alan eklenmesi veya var olan bir alanın silinmesi/tipinin değiştirilmesi; Bitfield layout değişimi; Header, Slave/Broadcast ID veya Checksum yapısı güncellemeleri; mevcut Enum değerlerinin sırasının/sayısal karşılıklarının değişimi veya Enum boyutunun (`u8`/`u16`/`u32`) değiştirilmesi; mevcut Message ID'lerinin değişimi.
  * **Minor Artışı (Non-Breaking Changes):** Struct veya Bitfield içindeki mevcut Spare/Reserved alanların bayt boyutunu ve offset'leri değiştirmeden kullanıma açılması; Enum sırasını bozmadan listenin sonuna yeni Enum seçeneği eklenmesi; mevcut paket dizilimlerini etkilemeyecek tamamen yeni bir Mesaj, Side, Struct veya Enum tanımlanması.
  * **Patch Artışı (Uyum Etkisi Olmayanlar):** Yalnızca metinsel açıklama (description), Min/Max sınır değerleri veya dokümantasyon düzeltmeleri.

---

## 2. Haberleşme Tarafları (Sides & Topology) ve Veri Akış Yönetimi

* **2.1. Haberleşme Tarafları Tanımlama (Side Configuration):**
  * Protokol kapsamında haberleşen taraflar (Sides) tanımlanabilecektir (ör. `Windows PC (Master Side)`, `Linux Board (Slave Side)`, `STM32 Motor Driver (Device Side)`).
  * Her mesaj tanımlanırken zorunlu olarak bir **Gönderici Taraf (Source Side)** ve bir **Alıcı Taraf (Destination Side)** seçilecektir.

* **2.2. Taraf Bazlı Message ID Tekillik (Uniqueness) Kuralı:**
  * Message ID tekillik doğrulaması küresel değil, **"Gönderici Taraf (Source Side) -> Alıcı Taraf (Destination Side)" çifti bazında (Yön bazlı)** kontrol edilecektir.
  * *Örnek:* PC Side -> Board Side yönündeki `0x01` ID'li mesaj ile Board Side -> PC Side yönündeki `0x01` ID'li mesaj çakışma oluşturmayacak, her ikisi de kendi yönünde benzersiz (unique) kabul edilecektir.

* **2.3. Komut - Yanıt (Command - Response) İlişkilendirmesi:**
  * Her bir mesaj tanımlanırken bir **Yanıt Mesajı (Response Message)** bağlanabilecektir (Link).
  * Seçenekler: Sisteme kayıtlı başka bir Mesaj (`Response: MSG_ACK_01`), özel durum mesajı veya `Yanıt Yok (No Response / Fire-and-Forget)`.
  * HTML dokümantasyon çıktısında ve arayüzde bir komut incelenirken, bağlı olduğu yanıt mesajı doğrudan tıklanabilir bağlantı (Hyperlink) olarak gösterilecektir.

---

## 3. Protokol Tanımlama ve Entegre Header Modülü (Protocol Layer)

* **3.1. Entegre Header Yapılandırması (Integrated Header Builder):**
  * Header yapısı genel veri Struct'larından bağımsız olarak doğrudan **Protokol Tanımlama Ekranı** içerisinde özelleştirilebilir bir alt modül olarak tanımlanacaktır.
  * Header içerisindeki her bir alanın türü (`u8`, `u16`, `u32` vb.) ve protokol bazındaki rolü (Role Binding) eşlenecektir:
    * `Sync / Start Marker` (Örn: `0xAA55`)
    * `Message ID Identifier` (Mesajdan otomatik alınır)
    * `Destination / Slave ID` (Side bilgisinden otomatik alınır)
    * `Payload Byte Size` (Payload boyutundan otomatik hesaplanır)

* **3.2. Bus Haberleşmesi ve Adresleme (Slave & Broadcast ID):**
  * **Slave ID (Target Device Address):** Bus üzerindeki alıcı cihazın fiziksel/mantıksal adresini belirten alan (`u8` veya `u16` tipinde).
  * **Broadcast ID:** Tüm cihazların dinlediği genel yayın adresi (ör. `0xFF` veya `0xFFFF`).
  * Bu adresleme verisi Header yapısı içerisindeki ilgili role eşlenecektir.

* **3.3. Paket Çerçevesi (Framing Configuration):**
  * **Start Marker / End Marker:** Başlangıç ve bitiş bayt bayrakları (örn. `0xAA55` / `0xFF00`), varlık kontrolü ve boyut tanımları.
  * **Max Payload Size:** Protokol seviyesinde izin verilen maksimum paket boyutu kısıtlaması.

* **3.4. Doğrulama Verisi (Checksum / Hash Layer):**
  * Desteklenen algoritmalar: `CRC8`, `CRC16`, `CRC32`, `Custom Hash / Sum`.
  * **Konum Seçeneği (Position):** Paket içerisindeki yeri esnektir (*Header Sonrası* veya *Payload Sonrası/Paket Sonu*).

* **3.5. Bayt Sıralaması (Endianness):**
  * Protokol seviyesinde `Little-Endian` veya `Big-Endian (Network Byte Order)` seçeneği bulunacaktır.

---

## 4. Mesaj ve Veri Tipi Tanımlama Modülü (Data & Message Layer)

* **4.1. Bellek Hizalaması (Data Alignment):**
  * Tüm paket ve struct dizilimleri istisnasız **1-Byte Packed** (dolgusuz bellek yerleşimi) yapısında olacaktır.

* **4.2. Enum Veri Tipi ve Boyut Konfigürasyonu:**
  * Numaralandırma (Enum) tanımları fiziki paket diziliminde kaplayacağı bayt genişliğine göre esnek olarak yapılandırılabilecektir.
  * Desteklenen Enum boyutları: `8-bit (u8 / 1 Byte)`, `16-bit (u16 / 2 Byte)` ve `32-bit (u32 / 4 Byte)`.
  * Tanımlanan Enum elemanlarının sayısal değerleri seçilen Enum boyutunun fiziki sınırlarını (ör. `u8` için 255, `u16` için 65535) aşamaz.

* **4.3. Bitfield Yönetimi ve Otomatik Spare Tamamlama:**
  * Kullanıcı değişken bit uzunlukları tanımlayabilecektir (örn. 3-bit veri, 5-bit spare).
  * Bitfield alanlarının toplamı 8 bit veya katı yapmadığı durumlarda, sistem eksik kalan kısmı otomatik olarak **Spare/Padding Bit** ile 8'in katına tamamlayacak ve kullanıcıya bildirim verecektir.

* **4.4. Dinamik Veri ve Sayaç (Indicator) Bağlantı Modülü:**
  * Struct içerisine bir String, Dizi veya başka bir Struct eklendiğinde "Is Dynamic / Variable Length" anahtarı (checkbox/toggle) sunulacaktır.
  * Dinamik alan işaretlendiğinde arayüz kullanıcıya iki seçenek sunacaktır:
    1. **Create New Size Indicator:** Otomatik olarak dinamik veriden hemen önce gelmek üzere yeni bir `u8`, `u16` veya `u32` türünde sayaç alanı ekler.
    2. **Link to Existing Field:** Dinamik veriden daha önce tanımlanmış tamsayı türündeki (`u8`, `u16`, `u32`) var olan bir alanı bu dinamik verinin eleman adedi/boyut sayacı olarak eşler.

---

## 5. Kullanıcı Arayüzü ve Gezinme (UI & Navigation)

* **5.1. Sol Menü Mimarisi:**
  * **Protocols (Protokoller):** Ağ, entegre header ve paket çerçeveleme kuralları.
  * **Sides (Taraflar / Cihazlar):** Gönderici ve alıcı sistem tanımları.
  * **Payload Structs (Yapılar):** Yeniden kullanılabilir karmaşık veri yapıları.
  * **Enums (Numaralandırmalar):** `u8`, `u16` veya `u32` boyut seçeneğine sahip sabit semantik değer listeleri.
  * **Messages (Mesajlar):** Yön, ID, Payload ve Yanıt ilişkisini barındıran nihai mesaj tanımları.

* **5.2. Adımlı Mesaj Oluşturma Akışı (New Message Creation Flow):**
  1. **Adım 1:** "Yeni Mesaj" butonuna basıldığında açılan Modal'da `Mesaj İsmi`, `Gönderici Taraf (Source Side)`, `Alıcı Taraf (Destination Side)` ve `Message ID` girilmesi zorunlu tutulacaktır.
  2. **Adım 2:** İlgili Gönderici->Alıcı yönü için Message ID tekillik kontrolü yapıldıktan sonra `Yanıt Mesajı (Response)` seçimi (Var / Yok) istenecektir.
  3. **Adım 3:** Onay sonrası mesajın Payload (Struct) düzenleme alanına geçilecektir.

* **5.3. Dinamik Paket Görselleştirmesi (Wire Layout View & Matrix View):**
  * **Header Bloğu:** Protokol içerisinde tanımlanan özel Header yapısını birleşik veya detay hücreler olarak salt-okunur gösterir.
  * **Checksum Bloğu:** Seçilen konuma göre (*Header Sonrası* veya *Paket Sonu*) kilitli görsel gösterge olarak konumlanır.
  * **Payload Bloğu:** Kullanıcının eklediği Struct/Enum/Primitive alanları kapsar.
  * **Response Indicator Bloğu:** Mesajın bağlı olduğu Yanıt mesajının adı ve ID'si görsel bir rozet (badge) olarak paket kartının üstünde gösterilir.

---

## 6. Edge Case ve Sınır Koşul Yönetimi (Edge Cases & Constraints)

* **6.1. Dairesel Yanıt Bağımlılığı (Circular Response Prevention):**
  * A Mesajının yanıtı B Mesajı iken, B Mesajının yanıtının tekrar A Mesajı olarak seçilmesi sonsuz döngü oluşturmayacak şekilde yönetilmeli; ancak dairesel veri bağımlılıkları (Struct-A -> Struct-B -> Struct-A) kesinlikle engellenecektir.

* **6.2. Silme İşlemleri ve Yetim Referans Yönetimi (Cascading / Orphan Control):**
  * Silinmeye çalışılan bir Mesaj, başka bir Mesajın "Yanıt Mesajı" olarak seçilmişse sistem kullanıcıyı uyaracak ve yanıt bağlantısını koparmadan silmeye izin vermeyecektir.
  * Kullanımda olan bir Struct, Enum veya Side silinmeye çalışıldığında işlem engellenecek; bağımlı nesneler listelenecektir.
  * Başka bir dinamik veriye "Size Indicator" olarak bağlamış bir sayısal alan silinmeye çalışıldığında, bağlı dinamik alan uyarılacak ve işlem engellenecektir.

* **6.3. Taşma ve Aralık Kontrolü (Value Range Validation):**
  * Girilen Min/Max sınır değerleri seçilen veri tipinin ve Enum boyutunun (`u8`, `u16`, `u32`) fiziki kapasitesini aşamaz.
