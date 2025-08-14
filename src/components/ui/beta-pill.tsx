export const BetaPill=({size='small'}: {size: 'small' | 'large'})=>{
    return(
<div className={`bg-[#fff4d8] text-[#e5713c] px-3 py-1 rounded-lg w-min font-bold ${size === 'large' ? 'text-lg' : 'text-sm'}`}>
Beta
        </div>
    )
}