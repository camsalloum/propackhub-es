<?php 

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Material extends Model {
    use HasFactory;

    protected $fillable = ['name', 'solid', 'density', 'costPerKg', 'waste','subcategories_id'];


    public function subcategory()
    {
        return $this->belongsTo(Subcat::class, 'subcategories_id');
    }
}
