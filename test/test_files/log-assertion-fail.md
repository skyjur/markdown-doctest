```js
console.log(1);
// log => 2
```

```js
console.log(1);
console.log(2);
// log => 1
// log => 3
```

```js
console.log("multi", "param")
// log => "multi", "wrong-param"
```

```js
console.log({"deep": {"value": 1}})
// log => {"deep": {"value": 2}}
```