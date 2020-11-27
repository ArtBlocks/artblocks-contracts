

### install
node 10.x

`npm i`

### compile
`npx buidler compile`

### deploy

create a `.env` file at the root with two vars

```
PROTOTYPE_BR_INFURA_KEY=074e3b1da7000000
PRIVATE_KEY=61e7f869e9d9b2b000000
```

`npx buidler run ./scripts/1_deploy_gen_art_721.js --network ropsten`

`npx buidler run ./scripts/2_add_project.js --network ropsten`