import { Component, OnInit } from '@angular/core';
import { Ingredient } from '../../shared/ingredient.model';
import { Heroes } from '../../shared/heroes.model';

@Component({
  selector: 'app-shopping-edit',
  templateUrl: './shopping-edit.component.html',
  styleUrls: ['./shopping-edit.component.css']
})

export class ShoppingEditComponent implements OnInit {
  ingredientsArray:Ingredient[] = [
    {name:'Apple', amount:5}
    ]

    heroes: Heroes[] = [
      {id: 1, name:'Superman'},
      {id: 2, name:'Batman'},
      {id: 5, name:'BatGirl'},
      {id: 3, name:'Robin'},
      {id: 4, name:'Flash'}
    ]
  constructor() { }

  ngOnInit() {
  }

}
