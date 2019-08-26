```js
console.log("This should no affect log stack in next test");
```

```js
console.log(1);
// output: 1
```

```js
console.log(1);
// output: 1
console.log(2);
// output: 2
```

```js
console.log(1);
console.log(2);
// output: 1
// output: 2
```

```js
console.log("multi", "param")
// output: multi param
```

```js
console.log({"deep": {"value": 1}})
// output: {"deep":{"value":1}}
```