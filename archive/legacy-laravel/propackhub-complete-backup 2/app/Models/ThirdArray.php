<?php 

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ThirdArray extends Model
{
    use HasFactory;

    protected $table = 'operation_costs';

    protected $fillable = ['main_table_id','process-name', 'actual-hours','process-cost-hour','total-amount-actual','hidden-value'];
}