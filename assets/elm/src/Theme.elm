module Theme exposing (..)

import Css exposing (..)

assets : { logoAdvanced : String, logoLight : String }
assets =
    { logoAdvanced = "/images/division-advanced.svg"
    , logoLight = "/images/bs-logo-light.svg"
    }

pallet =
    { white = hex "#fcfcfc"
    , lightgrey = hex "#e8e8e8"
    , pink = hex "#f7567c"
    , yellow = hex "#fffae3"
    , blue = hex "#99e1d9"
    , grey = hex "#5d576b"
    }


theme =
    { bgPrimary = pallet.grey
    , bgSecondary = pallet.white
    , buttonAccent = pallet.lightgrey
    , tile = pallet.lightgrey
    , food = pallet.pink
    }
