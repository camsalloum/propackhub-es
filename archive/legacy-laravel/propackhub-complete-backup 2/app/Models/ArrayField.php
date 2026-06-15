<?php 

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ArrayField extends Model
{
    use HasFactory;

    protected $table = 'array_fields';

    protected $fillable = ['main_table_id','solid-input', 'micron-input','density-input','total-gsm-input','cost-per-kg-input','waste-input','cost-m-input','estimated-kg-req-input','lower-input','materialSelect','typeSelect'];
}