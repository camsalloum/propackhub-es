<?php 

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MainTable extends Model
{
    use HasFactory;

    protected $table = 'main_table';

    protected $fillable = ['customerName', 'jobName', 'productType', 'orderQuantity','units','user_id','project_date','projectNumber'];

    public function secondary()
    {
        return $this->hasOne(SecondaryTable::class,'main_table_id');
    }

    public function arrayFields()
    {
        return $this->hasMany(ArrayField::class);
    }

    public function secondArrayFields()
    {
        return $this->hasMany(SecondArray::class);
    }

    public function thirdArrayFields()
    {
        return $this->hasMany(ThirdArray::class);
    }
}
