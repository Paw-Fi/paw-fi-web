import classNames from "classnames"

export const BetaPill=({size='small'}: {size: 'small' | 'large'})=>{
    return(
<div className={classNames("bg-[#fff4d8] text-[#e5713c]  rounded-lg w-min font-bold",
   {
     "text-xs px-2 py-1": size === 'small',
    "text-base px-3 py-1": size === 'large',

   }
)}>
Beta
        </div>
    )
}