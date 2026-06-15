<?php 

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SecondaryTable extends Model
{
    use HasFactory;

    protected $table = 'secondary_table';

    protected $fillable = [
        'main_table_id', 'roll-real-width', 'roll-cut-off', 'roll-extra-printing-trim', 'roll-pieces-per-cut',
        'numberOfUpsRoll', 'lay-flat-value', 'real-width-value', 'cut-off-value',
        'extra-printing-trim-value', 'number-of-ups-value', 'open-height', 'open-width',
        'weight-of-one-meter-zip', 'cost-one-meter-zipper', 'cost-one-gr-zipper',
        'zipper-weight-per-pouch', 'zipper-cost-per-pouch', 'zipper-cost-one-kg',
        'quantity-req-zipper-one', 'quantity-req-zipper-two', 'cost-per-kg-last-value',
        'cost-m-last-field-tableless', 'last-est-kg', 'total-gsm-last-value',
        'film-density-input', 'pieces-per-kg-field', 'printing-fil-width','lastSalesPrice',
        'grams-per-peice', 'orderQuantityInKgs', 'total-gsm-calculated-value',
        'square-meter-per-kg-input', 'orderQuanInKpieces', 'total-cost-m-value',
        'linear-meter-per-kg', 'OrderQuanInMeter', 'hidden-field', 'markupPercent',
        'first-speed', 'first-setup', 'first-hour', 'first-process-cost',
        'second-speed', 'second-setup', 'second-hour', 'second-process-cost',
        'third-speed', 'third-setup', 'third-hour', 'third-process-cost','process-cost-three','fourth-speed','fourth-setup','fourth-hour','fourth-process-cost',
        'process-cost-four', 'fifth-speed', 'fifth-setup', 'fifth-hour',
        'fifth-process-cost', 'process-cost-fifth', 'six-speed', 'six-setup',
        'six-hour', 'six-process-cost', 'process-cost-six', 'seven-speed',
        'seven-setup', 'seven-hour', 'seven-process-cost', 'process-cost-seven',
        'eight-speed', 'eight-setup', 'eight-hour', 'eight-process-cost',
        'process-cost-eight', 'nine-speed', 'nine-setup', 'nine-hour','firstPercentage','firstDifferenceValue','secondDifferenceValue','secondPercentage','estimatedMargin','thirdPercentage','actualMargin','fourthPercentage',
        'nine-process-cost', 'process-cost-nine', 'first-per-kg-value',
        'second-per-kg-value', 'third-per-kg-value', 'fourth-per-kg', 'fifth-per-kg',
        'six-kg', 'perKpcsFirst', 'perKpcsSecond', 'perKpcsthird', 'perkpcsfourth','remarks',
        'fifth-kpcs', 'six-kpcs', 'FirstPerSqm', 'secondPerSqm', 'ThirdPerSqm','solvent-mix-hidden-field',
        'fourthPerSqm', 'fifth-sqm', 'six-sqm', 'perLmValue', 'secondPerLM','last-total-amount-two','actual-raw-material-cost-two','last-difference-two',
        'thirdPerLM', 'fourthLm', 'fifth-lm', 'six-lm','extrusion-check','printing-check','rewinding-check','lamination-1-check','lamination-2-check','lamination-3-check','slitting-check','sleeving-check','doctoring-check','total-process-cost','total-micron-input','process-cost-one','process-cost-two',
        'core-inside','roll-outside-diameter','film-on-roll-weight','film-on-roll-length','roll-width','pieces-per-roll','required-roll-weight-kg','core-inside-roll','extra-printing-trim','no_of_ups','final-output','estimation-total-cost','actual-total-cost','last-difference-one',
        'pouch-making-check','ten-speed','ten-setup','ten-hour','ten-process-cost','process-cost-ten','opearion-cost-per-kg','firstPerRoll','secondPerRoll','thirdPerRoll','fourthPerRoll','fifthPerRoll','sixPerRoll','actual-material-solvent','actual-consumption-solvent','actual-cost-per-kg-solvent','actual-total-amount-solvent','actual-difference','last-total-amount-one','actual-raw-material-cost-one'
    ];
}
