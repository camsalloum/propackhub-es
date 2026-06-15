<?php 

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SecondArray extends Model
{
    use HasFactory;

    protected $table = 'second_array';

    protected $fillable = ['main_table_id','actual-material', 'actual-consumption','actual-cost-per-kg','actual-total-amount','row_id','hidden-field-value'];
}