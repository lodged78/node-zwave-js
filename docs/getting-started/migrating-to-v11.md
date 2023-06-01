# Migrating to v11

I've put this off for a while now - we just got to a `.20` minor version for the first time.
But Z-Wave JS is on the road to certification, and some of those requirements are forcing my hand.

## Window Covering CC vs. Multilevel Switch CC

The `Window Covering CC` allows for more granular control of covers to the point of making `Multilevel Switch CC` redundant.
As a result, the Z-Wave specification forbids interacting with the `Multilevel Switch CC` on devices that support the `Window Covering CC`.

To avoid removing functionality for users, applications that plan on upgrading to `v11` must make sure to have support for the `Window Covering CC`.

## Changed return types of `Controller.firmwareUpdateOTA` and `Controller.firmwareUpdateOTW` methods

These methods previously only returned a `boolean` indicating success or failure. To get more information about the update result, applications had to listen to the `firmware update finished` event in addition to awaiting the returned promise.

To make this easier:

-   `firmwareUpdateOTA` now returns a `Promise<FirmwareUpdateResult>`
-   `firmwareUpdateOTW` now returns a `Promise<ControllerFirmwareUpdateResult>`

both of which contain the same information as the corresponding `firmware update finished` events.

## Renamed methods on the `ZWaveHost` interface

The `getSafeCCVersionForEndpoint` method has been renamed to `getSafeCCVersion`.  
The `getSupportedCCVersionForNode` method has been renamed to `getSupportedCCVersion`.

These methods were inconsistently named and none of the other methods that accept a node ID and endpoint index specify that in their name.

## `paramInformation` in custom device configuration files can no longer be an object

In version `8.6.0`, we switched from defining config parameters as an array of objects with instead of an object. Parsing objects was still supported for user-defined config files, but this is no longer the case.
All config files must now use the new format. See [this pull request](https://github.com/zwave-js/node-zwave-js/pull/3100) for details on the change.

## Added support for configuration parameters on endpoints

Configuration parameters on endpoints are now supported. For devices with config parameters on endpoints, the parameter numbers are likely **not** unique.

Applications that expect configuration parameters to only exist on the root device will have to be updated to support this change.

## Removed `preserveUnknownValues` driver option, distinguish between (known to be) unknown and not (yet) known states/values

Several CCs use the value 254 to indicate that a state is unknown. However this value often lies outside of the normal range of values, e.g. 0-99 for multilevel switches. Other CCs translate the raw numeric values to another type, e.g. `boolean` for the `Binary Switch CC`. So simply preserving the 254 isn't an option, because it would throw off applications which expect a value in the defined range or of the correct type.

Previously, Z-Wave JS used `"unknown"` or `undefined` (based on the driver option `preserveUnknownValues`), which both have downsides aswell:

-   The string `"unknown"` is obviously not a number or boolean, which could cause errors
-   `undefined` gets "filtered" out by the value DB, because it also means **no value**. As a result changes **to** `unknown` would cause no events
-   `undefined` could also mean the data hasn't been queried yet, but it is impossible to distinguish from the `unknown` case

To solve this dilemma, Z-Wave JS now uses two distinct values (and types using the same name):

-   `NOT_KNOWN` is an alias for `undefined` and indicates that a value is **not known (yet)**, either for a value that has not been queried yet, or where no response was received
-   `UNKNOWN_STATE` is an alias for `null` and indicates that some information has been queried, but the corresponding state is **(known to be) unknown**. For example a multilevel device without intermediate position support - it knows that it is neither fully open, nor fully closed, but not the exact position.

Two related utility types have been introduced to preserve this distinction through the type system and replace the former `Maybe<T>` type:

-   `MaybeNotKnown<T>` is `T | NOT_KNOWN` and indicates that something is either of the type `T`, or `NOT_KNOWN = undefined`
-   `MaybeUnknown<T>` is `T | UNKNOWN_STATE` and indicates that something is either of the type `T`, or `UNKNOWN_STATE = null`

Many method signatures and properties which previously used `undefined` to indicate an uncertainty have been updated to use either of the previous types to make it clear what an absence of a value means. Likewise, several CC values can now be `null / UNKNOWN_STATE`. The `preserveUnknownValues` driver option has been removed.

Application developers should double-check their code for a common class of errors/bugs that could be introduced by this change, e.g.:

-   The comparisons `== null`, `== undefined`, `!= null` and `!= undefined` fail to distinguish between `NOT_KNOWN` and `UNKNOWN_STATE`. While it is generally recommended to use triple-equals comparison in JavaScript, in these cases, double-equals is a convenient way to compare against both `null` and `undefined` at the same time.
-   Likewise for nullish coalescing and optional chaining operators (`?.`, `??`, `??=`)
-   Expecting a `number` or `boolean` when a CC value is not `undefined` is no longer safe, because it could be `null`.

## Removed several deprecated method signatures, enums and properties

-   The enum member `NodeType["Routing End Node"]` has been removed. This has been called `"End Node"` since `v9.3.0`
-   `ConfigurationMetadata.name` was removed in favor of `label`
-   `ConfigurationMetadata.info` was removed in favor of `description`
-   `Controller.getBroadcastNodeInsecure` and `Controller.getBroadcastNodes` were removed in favor of `Controller.getBroadcastNode`
-   `Controller.getMulticastGroupInsecure`, `Controller.getMulticastGroupS2` and `Controller.getMulticastGroups` were removed in favor of `Controller.getMulticastGroup`
-   `Controller.beginOTAFirmwareUpdate` was removed in favor of `Controller.firmwareUpdateOTA`
-   The `Controller.beginExclusion` overloads accepting a `boolean` or the string `"inactive"` have been removed. Use the overload with `ExclusionOptions` instead.
-   `ZWaveNode.beginFirmwareUpdate` was removed in favor of `ZWaveNode.updateFirmware`
-   The deprecated arguments of the `"firmware update progress"` and `"firmware update finished"` event callbacks of the `ZWaveNode` class were removed. The `progress` and `result` arguments are now in the 2nd place instead of in the 4th one.