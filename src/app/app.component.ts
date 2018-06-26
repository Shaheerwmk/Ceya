import { Component } from '@angular/core';
import { Http, Response} from '@angular/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private apiUrl = 'http://my-json-server.typicode.com/techsithgit/json-faker-directory/profiles';
  constructor(private http: Http){
    console.log('Hello Fellow Users');
    this.getData();
    this.postData();
  }

  getData(){
    this.http.get(this.apiUrl)
    .subscribe(
             (res:Response) => {
             const value = res.json();
             console.log(value)
            });
  }

  postData(){
    this.http.post('http://my-json-server.typicode.com/techsithgit/json-faker-directory/profiles/',
    {
      name:'Shaheer',
      age:5
    })
    .subscribe(
             (res:Response) => {
             const value = res.json();
             console.log(value)
            });
  }
}
