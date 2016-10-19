# Authentication Condition Service

## registering the condition

there are two configurations that can be attached
to products, productVariants or productGroups

- optional: the user may authenticate
- mandatory: the user must authenticate


    post /superuser-discount-condition.configuration/mandatory/shop.productGroup/345



## resolving the auth condition

auth must resolved once per cart, appiles to one or more lineItems

*request:*

    put /authCondition/{id}

*responses:*

- 200 ok: the call was successful. doesn't indicate that the condition is resolved, only that the call was ok and accepted.
- 400 bad request: the request was invlaid
- 404 not found: the condition could not be found
- 500 server error: the server failed



#### getting the auth condition status

    get /authCondition/{id}

response:

    {
          id: '{tokenId}'
        , type: 'tos'
        , status: 'resolved|unresolved'
        , appliesTo: [{tokenId}, {tokenId}]
    }







