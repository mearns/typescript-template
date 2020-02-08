# build-object-better

A javascript package for building objects from their properties. Meant to be a replacement for all of your:

```javascript
const object = keys.reduce((o, k) => {
  o[k] = figureOutValue(k);
  return o;
}, {});
```

Instead:

```javascript
const object = buildObject(keys, figureOutValue);
```

- [Detailed API docs](https://mearns.github.io/build-object-better/globals.html#buildobject)
- [Find the code on github](https://github.com/mearns/build-object-better/)
- [Find the package on npm](https://www.npmjs.com/package/build-object-better)

## Overview

The general form of the call is `buildObject(iterable, [[keySupplier], valueSupplier])`; in order to generate
the keys and values of the generated object, the iterable is iterated over and for each element, the `keySupplier`
and `valueSupplier` are invoked to generate the respective components of one key/value pair which will be
added as a property on the generated object.

Each supplier can either be a function to generate the value, an array of values corresponding to the order
of the `iterable`, or an `object` of properties that will supply the values. In addition, the `valueSupplier`
can be a primitive value which will be used as the value for all built properties. Details for each of these
options are described below.

Invoked with two arguments, the `valueSupplier` is provided by the caller, but a default `keySupplier` is used,
which simply uses the element from the `iterable` as a key. In other words, the `iterable` is treated as the
complete list of keys.

The function can also be invoked with a single argument. If this argument is an iterable object,
then the elements of the iterable define the properties of the built object, either as an array of two
elements (`[key, value]`), or as an object with a `key` property and a `value` property.

If the single argument is a non-iterable `object`, then it is shallow copied.

### Key Suppliers

When invoked with 3 arguments, the second argument is called the _key supplier_ and is used to generate
the keys, or property names, of the generated object.

| Key Supplier      | Type of arg `K`                                                      | Description                                                                                                                                            | Defined for arg `K` over `iterable`                   |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| supplier function | <code>function(elem:\*, idx:number, iterable:Iterable):string</code> | A function that is invoked for each element in the `iterable` (first argument) to generate a corresponding key/property-name for the generated object. | `keySupplier = (elem, idx) => K(elem, idx, iterable)` |
| key list          | <code>Array.&lt;string&gt;</code>                                    | An array of keys/property-names corresponding to the ordered elements of `iterable`.                                                                   | `keySupplier = (elem, idx) => K[idx]`                 |
| key map           | <code>Object</code>                                                  | An object whose properties map the elements of the `iterable` to keys/property-names of the generated object.                                          | `keySupplier = (elem) => K[elem]`                     |

### Value Suppliers

When invoked with 2 or 3 arguments, the last argument is called the _value supplier_ and is used to generate
the property values of the generated object.

| ValueSupplier     | Type of arg `V`                                                                                                 | Description                                                                                                                                                                            | Defined for arg `V` over `iterable`                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| supplier function | <code>function(key:string, idx: number, keys:Iterable.&lt;string&gt;, elem:\*, iterable:Iterable):string</code> | A function that is invoked for each element in the `iterable` (first argument), along with the corresponding key, to generate a corresponding property value for the generated object. | `valueSupplier = (elem, idx) => V(/* key */ keySupplier(elem, idx, iterable), idx, /* keys */ iterable.map(keySupplier), elem, iterable)` |
| value list        | <code>Array.&lt;\*&gt;</code>                                                                                   | An array of values corresponding to the ordered elements of `iterable`.                                                                                                                | `valueSupplier = (elem, idx) => V[idx]`                                                                                                   |
| value source      | <code>Object</code>                                                                                             | An object from which properties named by the keys will be copied.                                                                                                                      | `valueSupplier = (elem, idx) => V[keySupplier(elem, idx, iterable)]`                                                                      |
| constant value    | <code>(string\|number\|boolean\|null\|undefined\|symbol)</code>                                                 | A fixed value that will be used as the value for all properties installed on the build object                                                                                          | `valueSupplier = () => V`                                                                                                                 |

## API

_For more details on the API, see the [detailed API docs](https://mearns.github.io/build-object-better/globals.html#buildobject)_

### `buildObject(iterable, keySupplier, valueSupplier)`

Build an object from an iterable, with suppliers to generate the keys and values of the object's properties.

See above for an explanation of the different options for the `keySupplier` and `valueSupplier`.

### `buildObject(keys, valueSupplier)`

Build an object from an iterable of keys/property-names and a function to generate corresponding property values for each one.

See above for an explanation of the different options for the `valueSupplier`.

### `buildObject(entries)`

Build an object from an iterable of entries, each giving the name and value of one property in the object (e.g., as returned by `Object.entries`).

| Param   | Type                                               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| entries | <code>Iterable&lt;(Array\|{key, value})&gt;</code> | An iterable of entries, each entry specifying both the name and value of a property for your object. Each entry can be an Array, or an object.<br />If an Array, then the first item (index 0) in the Array is the name of the property (the "key"), and the second item (index 1) is the property value.<br />If the entry is not an array, then it is assumed to be an Object with a "key" property specifying the property name, and a "value" property specifying its value. |

### `buildObject(source)`

Build an object as a shallow-clone of another object. The returned object will have all the same _own_ properties as the provided
source, with the same value. Values are not cloned, but copied directly, thus non-primitive objects (such as Arrays and Objects)
will actually be references to the same in-memory value.

| Param  | Type                | Description          |
| ------ | ------------------- | -------------------- |
| source | <code>Object</code> | The object to clone. |
