```js
console.log("This should no affect log stack in next test");
```

```js
console.log(1);
// log => 1
```

```js
console.log(1);
// log => 1
console.log(2);
// log => 2
```

```js
console.log(1);
console.log(2);
// log => 1
// log => 2
```

```js
console.log("multi", "param")
// log => "multi", "param"
```

```js
console.log({"deep": {"value": 1}})
// log => {"deep": {"value": 1}}
```