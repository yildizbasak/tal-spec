# TAL (Transmission Abstraction Layer)

**TAL** is a lightweight, browser-based protocol definition tool designed to simplify the creation and management of embedded communication protocols. It provides a visual interface for defining Enums, Structs, and Messages, generating structured XML configurations for use in firmware or software projects.

---

## Key Features

* **Visual Memory Mapping**: Defines data structures in a bit-level grid, automatically handling alignment (padding) and "spare" bit management.

* **Hierarchical Composition**: Allows nesting of Enums and Structs within other Structs or Messages with automatic size recalculation.

* **Dynamic Protocols**: Defines a central protocol configuration (Headers, CRC/Checksums) that automatically propagates to all defined messages.

* **Interactive UI**: Supports Drag-and-Drop ordering of fields, side-bar editing for comments/documentation, and dynamic array handling.

* **Zero-Dependency**: Runs entirely in the browser using HTML5, CSS3, and Vanilla JavaScript. No installation or build environment required.

* **XML Import/Export**: Fully supports saving your protocol definitions to `TAL.xml` and loading them back for further editing.

---

## How to Use

1. **Open the Application**: Open `index.html` in any modern web browser.
2. **Define Protocol**: Click **⚙️ Protokol Ayarları** to define global headers or CRC requirements.

3. **Build Components**:

* Create **Enums** for status codes or state machines.
* Create **Structs** to define reusable data blocks.

1. **Define Messages**: Create messages and drag-and-drop previously defined Structs or Enums into them.

2. **Configure Fields**: Click on any field in the memory map to edit its name, description, or toggle dynamic array properties in the right sidebar.

3. **Generate/Export**: Click **XML Üret ve İndir** to save your protocol definition.

---

## Data Structure Logic

* **Memory Map**: The application uses an 8-bit wide grid layout (Byte-aligned). Any fields not filling an 8-bit boundary are automatically padded with "spare" bits.

* **Sync Engine**: Whenever a Struct or Enum is updated, the tool automatically recalculates the size of all parent structures and messages that reference it.

* **XML Schema**: The generated XML acts as a single source of truth, containing protocol rules, element definitions, and layout metadata.

---

## Technical Details

* **Frontend**: Built with HTML5, CSS3, and pure Vanilla JavaScript.

* **Storage**: Uses browser-based logic for state management; persistence is achieved via XML file export.

* **Compatibility**: Designed to be the front-end for a future code-generator that can map these XML definitions directly into C++ structs or Qt-based serialization layers.
